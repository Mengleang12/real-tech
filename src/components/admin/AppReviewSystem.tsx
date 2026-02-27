import { useState } from "react";
import { 
  CheckCircle, XCircle, Clock, Eye, Filter, Search, Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AdminDialog, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./AdminDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { submissionsApi, type AppSubmission } from "@/lib/api";
import { toast } from "sonner";

type AppStatus = "draft" | "pending_review" | "approved" | "rejected" | "suspended";

const statusConfig: Record<AppStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Draft", color: "bg-gray-500/20 text-gray-600", icon: Clock },
  pending_review: { label: "Pending Review", color: "bg-yellow-500/20 text-yellow-600", icon: Clock },
  approved: { label: "Approved", color: "bg-green-500/20 text-green-600", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-600", icon: XCircle },
  suspended: { label: "Suspended", color: "bg-orange-500/20 text-orange-600", icon: XCircle }
};

export const AppReviewSystem = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppStatus | "all">("all");
  const [selectedSubmission, setSelectedSubmission] = useState<AppSubmission | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  // Fetch submissions from Laravel API
  const { data, isLoading } = useQuery({
    queryKey: ["app-submissions", statusFilter],
    queryFn: () => submissionsApi.getAll(statusFilter === "all" ? undefined : statusFilter),
  });

  const submissions = data?.submissions || [];
  const pendingCount = data?.stats?.pending || 0;

  // Update submission status
  const updateSubmission = useMutation({
    mutationFn: ({ id, status, notes, reason }: { 
      id: number; 
      status: AppStatus; 
      notes?: string;
      reason?: string;
    }) => submissionsApi.update(id, { status, review_notes: notes, rejection_reason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-submissions"] });
      toast.success("Submission updated successfully");
      setShowReviewDialog(false);
      setSelectedSubmission(null);
      setReviewNotes("");
      setRejectionReason("");
    },
    onError: () => {
      toast.error("Failed to update submission");
    }
  });

  const handleApprove = () => {
    if (!selectedSubmission) return;
    updateSubmission.mutate({
      id: selectedSubmission.id,
      status: "approved",
      notes: reviewNotes
    });
  };

  const handleReject = () => {
    if (!selectedSubmission || !rejectionReason) {
      toast.error("Please provide a rejection reason");
      return;
    }
    updateSubmission.mutate({
      id: selectedSubmission.id,
      status: "rejected",
      notes: reviewNotes,
      reason: rejectionReason
    });
  };

  const handleSuspend = () => {
    if (!selectedSubmission) return;
    updateSubmission.mutate({
      id: selectedSubmission.id,
      status: "suspended",
      notes: reviewNotes
    });
  };

  const filteredSubmissions = submissions.filter(sub => 
    sub.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.product_id.toString().includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Product Review System</h2>
          <p className="text-muted-foreground">
            Manage product submissions and approvals
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingCount} pending</Badge>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product ID or version..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AppStatus | "all")}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Submissions List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading submissions...
            </CardContent>
          </Card>
        ) : filteredSubmissions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No submissions found
            </CardContent>
          </Card>
        ) : (
          filteredSubmissions.map((submission) => {
            const statusInfo = statusConfig[submission.status];
            const StatusIcon = statusInfo.icon;
            
            return (
              <Card key={submission.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                        <span className="text-lg font-bold">{submission.product_id}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {submission.product?.name || `Product #${submission.product_id}`}
                          </span>
                          <Badge variant="outline">v{submission.version}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Submitted {new Date(submission.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge className={statusInfo.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setReviewNotes(submission.review_notes || "");
                          setRejectionReason(submission.rejection_reason || "");
                          setShowReviewDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <AdminDialog 
        open={showReviewDialog} 
        onOpenChange={setShowReviewDialog} 
        title="Review Submission" 
        size="lg"
        footer={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:justify-end">
            <Button variant="destructive" onClick={handleSuspend} disabled={updateSubmission.isPending}>
              {updateSubmission.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Suspend
            </Button>
            <Button variant="outline" onClick={handleReject} disabled={updateSubmission.isPending}>
              {updateSubmission.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
              Reject
            </Button>
            <Button onClick={handleApprove} disabled={updateSubmission.isPending}>
              {updateSubmission.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
              Approve
            </Button>
          </div>
        }
      >
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product</span>
                  <span className="font-medium">{selectedSubmission.product?.name || `#${selectedSubmission.product_id}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-medium">{selectedSubmission.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted</span>
                  <span className="font-medium">{new Date(selectedSubmission.submitted_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Status</span>
                  <Badge className={statusConfig[selectedSubmission.status].color}>{statusConfig[selectedSubmission.status].label}</Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Review Notes</label>
                <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Add internal notes about this submission..." className="mt-1.5" rows={3} />
              </div>
              <div>
                <label className="text-sm font-medium">Rejection Reason (required for rejection)</label>
                <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Explain why this submission is being rejected..." className="mt-1.5" rows={3} />
              </div>
            </div>
          )}
      </AdminDialog>
    </div>
  );
};
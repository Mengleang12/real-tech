import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      expand={false}
      richColors={false}
      gap={8}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group toast !rounded-xl !border !shadow-lg !shadow-black/10 !py-3.5 !px-4 !gap-3 !font-medium !text-sm backdrop-blur-sm " +
            "group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border",
          title: "group-[.toast]:font-semibold group-[.toast]:text-sm group-[.toast]:leading-snug",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-xs group-[.toast]:leading-relaxed group-[.toast]:mt-0.5",
          success:
            "group-[.toaster]:!bg-card group-[.toaster]:!border-green-500/30 group-[.toaster]:!text-foreground " +
            "[&>[data-icon]]:!text-green-500",
          error:
            "group-[.toaster]:!bg-card group-[.toaster]:!border-destructive/30 group-[.toaster]:!text-foreground " +
            "[&>[data-icon]]:!text-destructive",
          warning:
            "group-[.toaster]:!bg-card group-[.toaster]:!border-amber-500/30 group-[.toaster]:!text-foreground " +
            "[&>[data-icon]]:!text-amber-500",
          info:
            "group-[.toaster]:!bg-card group-[.toaster]:!border-primary/30 group-[.toaster]:!text-foreground " +
            "[&>[data-icon]]:!text-primary",
          actionButton:
            "group-[.toast]:!bg-primary group-[.toast]:!text-primary-foreground group-[.toast]:!rounded-lg group-[.toast]:!text-xs group-[.toast]:!font-semibold group-[.toast]:!px-3 group-[.toast]:!py-1.5",
          cancelButton:
            "group-[.toast]:!bg-muted group-[.toast]:!text-muted-foreground group-[.toast]:!rounded-lg group-[.toast]:!text-xs group-[.toast]:!px-3 group-[.toast]:!py-1.5",
          closeButton:
            "group-[.toast]:!border-border group-[.toast]:!bg-background group-[.toast]:!text-muted-foreground group-[.toast]:hover:!text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };

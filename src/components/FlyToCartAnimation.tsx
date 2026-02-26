import { useCart } from "@/contexts/CartContext";
import { useEffect, useRef, useState } from "react";

export const FlyToCartAnimation = () => {
  const { flyingItems } = useCart();

  return (
    <>
      {flyingItems.map((item) => (
        <FlyingImage key={item.id} iconUrl={item.iconUrl} startRect={item.startRect} />
      ))}
    </>
  );
};

const FlyingImage = ({ iconUrl, startRect }: { iconUrl: string; startRect: DOMRect }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"start" | "fly">("start");

  useEffect(() => {
    // Find the cart icon target
    const target = document.getElementById("cart-icon-target");
    if (!ref.current || !target) return;

    const targetRect = target.getBoundingClientRect();

    // Set initial position
    ref.current.style.left = `${startRect.left + startRect.width / 2 - 24}px`;
    ref.current.style.top = `${startRect.top + startRect.height / 2 - 24}px`;

    // Trigger fly on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!ref.current) return;
        ref.current.style.left = `${targetRect.left + targetRect.width / 2 - 12}px`;
        ref.current.style.top = `${targetRect.top + targetRect.height / 2 - 12}px`;
        ref.current.style.transform = "scale(0.3)";
        ref.current.style.opacity = "0.4";
        setPhase("fly");
      });
    });
  }, [startRect]);

  return (
    <div
      ref={ref}
      className="fixed z-[9999] pointer-events-none"
      style={{
        width: 48,
        height: 48,
        transition: "all 0.55s cubic-bezier(0.22, 1, 0.36, 1)",
        transform: "scale(1)",
        opacity: 1,
      }}
    >
      {iconUrl ? (
        <img
          src={iconUrl}
          alt=""
          className="w-full h-full rounded-xl object-cover shadow-lg ring-2 ring-primary/30"
        />
      ) : (
        <div className="w-full h-full rounded-xl bg-primary/20 shadow-lg" />
      )}
    </div>
  );
};

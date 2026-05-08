import { useRouter } from "@tanstack/react-router";

export function BackButton({ fallback = "/", label = "← Back" }: { fallback?: string; label?: string }) {
  const router = useRouter();
  const onClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      router.navigate({ to: fallback });
    }
  };
  return (
    <button onClick={onClick} className="text-sm text-muted-foreground hover:text-foreground">
      {label}
    </button>
  );
}

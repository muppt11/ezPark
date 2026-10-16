export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">{children}</div>;
}

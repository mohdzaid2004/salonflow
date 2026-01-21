export default function InvoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 print:bg-white">
      {children}
    </div>
  );
}

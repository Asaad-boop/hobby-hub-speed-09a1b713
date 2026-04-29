export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
      <p className="mt-2 text-sm text-gray-500">Coming soon</p>
    </div>
  );
}

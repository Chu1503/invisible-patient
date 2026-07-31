import AuthForm from "@/components/AuthForm";

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = firstValue(params.error);
  const configurationMissing =
    firstValue(params.configuration) === "missing";

  return (
    <main className="auth-page">
      <AuthForm
        initialError={error}
        configurationMissing={configurationMissing}
      />
    </main>
  );
}

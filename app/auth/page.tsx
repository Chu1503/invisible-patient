import AuthForm from "@/components/AuthForm";

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function safeNextPath(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
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
  const nextPath = safeNextPath(firstValue(params.next));

  return (
    <main className="auth-page">
      <div className="auth-aura auth-aura-one" aria-hidden="true" />
      <div className="auth-aura auth-aura-two" aria-hidden="true" />
      <AuthForm
        initialError={error}
        configurationMissing={configurationMissing}
        nextPath={nextPath}
      />
    </main>
  );
}

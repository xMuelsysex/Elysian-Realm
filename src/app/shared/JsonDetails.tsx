interface JsonDetailsProps {
  title: string;
  value: unknown;
  open?: boolean;
}

export function JsonDetails({ title, value, open = false }: JsonDetailsProps) {
  return (
    <details className="json-details" open={open}>
      <summary>{title}</summary>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

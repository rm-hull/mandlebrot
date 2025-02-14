import styles from "./ErrorFallback.module.css";

interface ErrorFallbackProps {
  error: Error;
}

export default function ErrorFallback({ error }: ErrorFallbackProps) {
  return (
    <div role="alert" className={styles.error}>
      <h1 className={styles.message}>{error.message}</h1>
      <h3>Stack trace:</h3>
      <pre>{error.stack}</pre>
    </div>
  );
}

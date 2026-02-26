import styles from "./page.module.scss";
import Link from "next/link";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.intro}>
          <h1 className={styles.introTitle}>DnD Combat Tools</h1>
          <p className={styles.introText}>
            A modern set of tools to help DMs run smooth and fast combat
            encounters at the table.
          </p>
          <div className={styles.ctas}>
            <Link
              href="/dm-initiative-tracker"
              className={styles.primaryButton}
            >
              DM Initiative Tracker
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

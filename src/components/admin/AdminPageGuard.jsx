/**
 * Wraps admin-only pages: signed-in users only; optional email allowlist via env.
 */
import React, { useContext } from "react";
import Link from "next/link";
import Container from "@/components/layout/container/Container";
import { AuthContext } from "@/firebase/authContext";
import { getFiatCryptoAdminEmailAllowlist, isEmailInFiatCryptoAdminAllowlist } from "@/utils/fiatCryptoAdminAccess";
import styles from "./AdminPageGuard.module.scss";

const AdminPageGuard = ({ title, children }) => {
    const { user, isAuthenticated } = useContext(AuthContext);
    const allowlist = getFiatCryptoAdminEmailAllowlist();

    if (!isAuthenticated || !user) {
        return (
            <Container>
                <div className={styles.panel}>
                    <h1 className={styles.title}>{title}</h1>
                    <p className={styles.text}>This area is for operations staff. Log in on the home page, then return here.</p>
                    <Link href="/" className={styles.link}>
                        Go to home
                    </Link>
                </div>
            </Container>
        );
    }

    if (!isEmailInFiatCryptoAdminAllowlist(user.email)) {
        return (
            <Container>
                <div className={styles.panel}>
                    <h1 className={styles.title}>{title}</h1>
                    <p className={styles.text}>
                        Your account does not have access to this admin area. If you need access, contact your administrator.
                    </p>
                    <Link href="/" className={styles.link}>
                        Go to home
                    </Link>
                </div>
            </Container>
        );
    }

    return (
        <>
            {allowlist.length === 0 ? (
                <div className={styles.banner} role="status">
                    Demo mode: any signed-in user can open admin pages. For production, set{" "}
                    <code className={styles.code}>NEXT_PUBLIC_FIAT_CRYPTO_ADMIN_EMAILS</code> to a comma-separated list of
                    ops emails.
                </div>
            ) : null}
            {children}
        </>
    );
};

export default AdminPageGuard;

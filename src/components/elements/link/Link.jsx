import React from "react";
import styles from "./Link.module.scss";

const Link = ({ onClick }) =>
    <div className={styles.container}>
        <label>You don&apos;t have an account <span><b>?</b></span></label>
        <button type="button" className={styles.linkLike} onClick={onClick}>
            Click here to register
        </button>
        <br />
    </div>



export default Link;
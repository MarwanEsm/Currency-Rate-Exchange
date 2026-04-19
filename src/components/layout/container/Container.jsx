import React from "react";
import styles from './Container.module.scss'

const Container = ({ children }) =>
    <div className={styles.parent}>
        <div className={styles.secondChild} aria-hidden="true" />
        <div className={styles.firstChild} aria-hidden="true" />
        <div className={styles.content}>{children}</div>
    </div>


export default Container




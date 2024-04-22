import React from "react";
import styles from './Container.module.scss'

const Container = () => {
    return (
        <div className={styles.parent}>
            <div className={styles.secondChild}></div>
            <div className={styles.firstChild}></div>
        </div>
    );
}

export default Container




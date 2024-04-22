import React from "react";
import { Link as RegistrationLink } from "react-router-dom";
import styles from './Link.module.scss'

const Link = () =>
    <div className={styles.container}>
        <label>You don't have an account <span><b>?</b></span></label>
        <RegistrationLink to="/RegistrationScreen">
            Click here to register
        </RegistrationLink>
        <br />
    </div>



export default Link
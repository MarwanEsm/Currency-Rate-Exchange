import React, { useState, useContext } from "react"
import Button from "../../elements/button/Button";
import { AuthContext } from "../../../firebase/authContext";
import styles from "./Login.module.scss"
import { Form } from "reactstrap";
import { Link } from "react-router-dom";


const Login = ({ onPasswordReset }) => {

    //TODO: add validation for email and password
    //TODO: add example of email and password as placeholder
    //TODO: add validation and check that password include number, special character and min 6 letters
    const [loginCredentials, setLoginCredentials] = useState({
        email: "",
        password: "",
    });

    const { login } = useContext(AuthContext)

    const handelChange = (e) => {
        const value = e.target.value;
        setLoginCredentials({ ...loginCredentials, [e.target.name]: value });
    };

    const onLogin = () => {
        login(loginCredentials)
    }
    const invalid = loginCredentials.email === "" || loginCredentials.password === "";

    return <div className={styles.container}>
        <Form>
            <div className={styles.formContainer}>
                <label>Email address</label>
                <input
                    type="email"
                    placeholder="example: jo@gmail.com"
                    data-ng-init="resp()"
                    name="email"
                    onChange={handelChange}
                    value={loginCredentials.email}
                    autoComplete=""
                />

                <label>Password</label>
                <input
                    type="password"
                    placeholder="Password"
                    data-ng-init="resp()"
                    name="password"
                    onChange={handelChange}
                    value={loginCredentials.password}
                    autoComplete=""
                />

                <Link onClick={onPasswordReset}> Forgot Password ? </Link>

                <Button onClick={() => onLogin()} disabled={invalid}>
                    Sign in
                </Button>

            </div>
        </Form>
    </div >
}

export default Login
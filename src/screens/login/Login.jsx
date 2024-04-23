import React, { useContext, useState } from "react";
import Form from "react-bootstrap/Form";
import Button from "../../components/elements/button/Button";
import { Link } from "react-router-dom";
import { Row, Col } from "reactstrap"
// import { AuthContext } from "../../firebase/FirebaseAuth";
import Container from "../../components/layout/container/Container";
import styles from "./Login.module.scss"

const LogIn = () => {
    const [state, setState] = useState({
        email: "",
        password: "",
    });

    // const { login } = useContext(AuthContext);

    const handelChange = (e) => {
        const value = e.target.value;
        setState({ ...state, [e.target.name]: value });
    };

    const handelLogin = (event) => {
        event.preventDefault();
        // login(state);
    };

    const invalid = state.email === "" || state.password === "";

    return (
        <div>
            <div>
                <Container></Container>
            </div>

            <div className={styles.formContainer}>
                <label>Email address</label>
                <input
                    type="email"
                    placeholder="Enter email"
                    data-ng-init="resp()"
                    name="email"
                    onChange={handelChange}
                    value={state.email}
                />

                <label>Password</label>
                <input
                    type="password"
                    placeholder="Password"
                    data-ng-init="resp()"
                    name="password"
                    onChange={handelChange}
                    value={state.password}
                />

                <Link to="/resetpassword" >
                    Forgot Password ?
                </Link>

                <Button
                    variant="warning"
                    disabled={invalid}
                    onClick={handelLogin}
                >
                    Sign in
                </Button>
            </div>
        </div>
    );
}



export default LogIn;

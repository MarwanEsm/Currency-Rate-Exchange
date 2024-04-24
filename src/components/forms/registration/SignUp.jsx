import React, { useState, useContext } from "react";
import Form from "react-bootstrap/Form";
import Button from "../../elements/button/Button";
import Popup from "reactjs-popup";
import "reactjs-popup/dist/index.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { AuthContext } from "../Firebase/FireBaseAuth";
import { Link } from "react-router-dom";
import Container from "../../layout/container/Container";
import styles from "./SignUp.module.scss"

const SignUp = () => {
    const [open, setOpen] = useState(false);

    const closePopup = () => {
        setOpen(false);
    };

    const { register } = useContext(AuthContext);

    const [state, setState] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        passwordConfirmation: "",
        country: "",
        city: "",
        zip: "",
        checked: false,
    });

    const changeInput = (event) => {
        const value = event.target.value;
        event.preventDefault();

        setState({
            ...state,
            [event.target.name]: value,
        });
    };

    const makeItChecked = () => {
        setState({ ...state, checked: !state.checked });
    };
    const handleRegister = (event) => {
        event.preventDefault();
        register(state);
        alert(
            "thank you for submitting your details, we've sent you a confirmation link to your E-mail"
        );
    };

    const openPopup = () => {
        setOpen(true);
    };

    const isInvalid =
        state.firstName === "" ||
        state.lastName === "" ||
        state.password === "" ||
        state.passwordConfirmation !== state.password ||
        state.country === "" ||
        state.city === "" ||
        state.zip === "" ||
        state.checked === false;

    return <div>
        <div>
            <Container></Container>
        </div>

        <Form>
            <div className={styles.formContainer}>

                <label>First Name</label>
                <input
                    type="text"
                    name="firstName"
                    value={state.firstName}
                    onChange={changeInput}
                />

                <label>Last Name</label>
                <input
                    type="text"
                    name="lastName"
                    value={state.lastName}
                    onChange={changeInput}
                />

                <label>Email</label>
                <input
                    type="email"
                    name="email"
                    value={state.email}
                    onChange={changeInput}
                />

                <label>Password</label>
                <input
                    type="password"
                    name="password"
                    value={state.password}
                    onChange={changeInput}
                />

                <label>Confirm Password</label>
                <input
                    type="password"
                    name="passwordConfirmation"
                    value={state.passwordConfirmation}
                    onChange={changeInput}
                />

                <label>Country</label>
                <input
                    type="text"
                    name="country"
                    value={state.country}
                    onChange={changeInput}
                />

                <label>City</label>
                <input
                    type="text"
                    name="city"
                    value={state.city}
                    onChange={changeInput}
                />

                <label>Zip</label>
                <input
                    type="number"
                    name="zip"
                    value={state.zip}
                    onChange={changeInput}
                />

                <input
                    onClick={makeItChecked}
                    defaultChecked={state.checked}
                    type="checkbox"
                />


                <p onClick={openPopup}>
                    Agree to terms and conditions
                </p>

                <Popup open={open} onClose={closePopup} position="center">
                    <Terms closePopup={closePopup} />
                </Popup>

                <Button
                    type="submit"
                    onClick={handleRegister}
                    disabled={isInvalid}
                >
                    Register
                </Button>

                <Link to="/LogInScreen">
                    Back to Log in
                </Link>
            </div>
        </Form>

    </div>
}


const Terms = ({ closePopup }) => {
    return (
        <div>
            <p>Terms Of Service</p>
            <h3>
                Make sure you're enjoying your life and enjoy using this App either
            </h3>
            <Button type="submit" onClick={closePopup}>
                Accept
            </Button>
        </div>
    );
}


export default SignUp;

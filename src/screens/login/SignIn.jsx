import React, { useContext, useState } from "react";
// import { AuthContext } from "../../firebase/FirebaseAuth";
import Container from "../../components/layout/container/Container";
// import styles from "./Login.module.scss"
import Login from "../../components/forms/login/Login";
import ResetPassword from "../../components/forms/resetPassword/ResetPassword";

const SignIn = () => {

    const [isPasswordForgotten, setIsPasswordForgotten] = useState(false)

    // const { login } = useContext(AuthContext);


    const handelLogin = (state) => {
        console.log(state);
        // login(state);
    };


    return (
        <div>
            <div>
                <Container></Container>
            </div>
            {isPasswordForgotten ?
                <ResetPassword /> :
                <Login onFormChange={() => setIsPasswordForgotten(true)} onLogin={(state) => handelLogin(state)} />
            }
        </div>
    );
}



export default SignIn;

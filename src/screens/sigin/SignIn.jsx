// import React, { useState, useContext } from "react";
// import { AuthContext } from "../../firebase/FirebaseAuth";
// import Container from "../../components/layout/container/Container";
// // import styles from "./Login.module.scss"
// import Login from "../../components/forms/login/Login";
// import ResetPassword from "../../components/forms/resetPassword/ResetPassword";

// const SignIn = () => {

//     const [isPasswordForgotten, setIsPasswordForgotten] = useState(false)

//     const { login } = useContext(AuthContext);


//     const handelLogin = (state) => {
//         console.log(state);
//         login(state);
//     };


//     return <Container>
//         {isPasswordForgotten ?
//             <ResetPassword /> :
//             <Login onPasswordReset={() => setIsPasswordForgotten(true)} onLogin={(state) => handelLogin(state)} />
//         }
//     </Container>
// }



// export default SignIn;

import "../src/style/global.scss";
import "bootstrap/dist/css/bootstrap.min.css";
import { AuthContextProvider } from "@/firebase/authContext";

const App = ({ Component, pageProps }) => {
  return (
    <AuthContextProvider>
      <Component {...pageProps} />
    </AuthContextProvider>
  );
};

export default App;

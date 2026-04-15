import "../src/style/global.scss";
import { AuthContextProvider } from "../src/firebase/authContext";

const App = ({ Component, pageProps }) => {
  return (
    <AuthContextProvider>
      <Component {...pageProps} />
    </AuthContextProvider>
  );
};

export default App;

import { useState } from "react";
import "./Login.css";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log({ email, password });
    };

    return (
        <div className="login-container">
            {/* LEFT */}
            <div className="login-left">
                <div className="overlay">
                    <p className="logo">Ledger Project</p>
                    <h1>
                        Architecture for <br /> Deep Focus.
                    </h1>
                    <p className="desc">
                        A workspace designed with editorial precision to anchor your most ambitious projects.
                    </p>
                </div>
            </div>

            {/* RIGHT */}
            <div className="login-right">
                <div className="form-box">
                    <h2>Welcome Back</h2>
                    <p className="sub">Enter your details to access your workspace.</p>

                    <button className="social-btn">
                        <FcGoogle size={18} />
                        Continue with Google
                    </button>

                    <button className="social-btn">
                        <FaGithub size={18} />
                        Continue with GitHub
                    </button>

                    <div className="divider">OR LOGIN WITH EMAIL</div>

                    <input
                        type="email"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <button className="login-btn" onClick={handleSubmit}>
                        Sign In to Workspace
                    </button>
                </div>
            </div>
        </div>
    );
}
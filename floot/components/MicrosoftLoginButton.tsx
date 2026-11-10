import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./Button";
import { Spinner } from "./Spinner";
import { useAuth } from "../helpers/useAuth";
import { postMicrosoftLoginEstablishSession } from "../endpoints/auth/microsoft_login_establish_session_POST.schema";
import styles from "./MicrosoftLoginButton.module.css";

interface MicrosoftLoginButtonProps {
  className?: string;
  disabled?: boolean;
  returnTo?: string;
}

type MicrosoftLoginPopupMessage =
  | { type: "MICROSOFT_LOGIN_TOKEN_SUCCESS"; token: string }
  | { type: "MICROSOFT_LOGIN_ERROR"; error: string };

export const MicrosoftLoginButton: React.FC<MicrosoftLoginButtonProps> = ({
  className,
  disabled,
  returnTo='/',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { onLogin } = useAuth();
  const navigate = useNavigate();

  const handleMicrosoftLogin = async () => {
    setIsLoading(true);
    setError(null);

    const popup = await window.open(
      `/_api/auth/microsoft_login_authorize`,
      "microsoftLogin",
      "width=500,height=600,scrollbars=yes,resizable=yes"
    );

    if (!popup) {
      setIsLoading(false);
      setError(
        "Failed to open authentication window. Please check if popup blockers are disabled and try again."
      );
      console.error(
        "Failed to open Microsoft login popup - popup blocker may be active"
      );
      return;
    }

    const handleMessage = async (
      event: MessageEvent<MicrosoftLoginPopupMessage>
    ) => {
      if (event.origin !== window.location.origin || event.source !== popup) {
        return;
      }

      if (event.data.type === "MICROSOFT_LOGIN_TOKEN_SUCCESS") {
        const { token } = event.data;

        try {
          const result = await postMicrosoftLoginEstablishSession({
            tempToken: token,
          });

          if ("error" in result) {
            console.error("Failed to establish session:", result.error);
            setError("Failed to complete authentication. Please try again.");
            popup.close();
            setIsLoading(false);
            window.removeEventListener("message", handleMessage);
            return;
          }

          console.log("Microsoft login successful");
          onLogin(result.user);
          setTimeout(() => navigate(returnTo), 200);
          popup.close();
          setIsLoading(false);
          window.removeEventListener("message", handleMessage);
        } catch (error) {
          console.error("Error establishing session:", error);
          setError(
            "An unexpected error occurred during authentication. Please try again."
          );
          popup.close();
          setIsLoading(false);
          window.removeEventListener("message", handleMessage);
        }
      } else if (event.data.type === "MICROSOFT_LOGIN_ERROR") {
        console.error("Microsoft login error:", event.data.error);
        setError(event.data.error || "Authentication failed. Please try again.");
        popup.close();
        setIsLoading(false);
        window.removeEventListener("message", handleMessage);
      }
    };

    window.addEventListener("message", handleMessage);

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        setIsLoading(false);
        window.removeEventListener("message", handleMessage);
      }
    }, 1000);

    const cleanup = () => {
      clearInterval(checkClosed);
      window.removeEventListener("message", handleMessage);
      if (!popup.closed) {
        popup.close();
      }
      setIsLoading(false);
    };

    setTimeout(() => {
      if (!popup.closed) {
        cleanup();
        console.error("Microsoft login popup timed out");
      }
    }, 300000);
  };

  return (
    <>
      <Button
        onClick={handleMicrosoftLogin}
        disabled={disabled || isLoading}
        className={`${styles.microsoftLoginButton} ${className || ""}`}
        variant="outline"
      >
        {isLoading ? (
          <>
            <Spinner size="sm" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <svg viewBox="0 0 23 23" width="18" height="18">
              <path fill="#f25022" d="M1 1h10v10H1z" />
              <path fill="#7fba00" d="M12 1h10v10H12z" />
              <path fill="#00a4ef" d="M1 12h10v10H1z" />
              <path fill="#ffb900" d="M12 12h10v10H12z" />
            </svg>
            <span>Continue with Microsoft</span>
          </>
        )}
      </Button>
      {error && <div className={styles.errorMessage}>{error}</div>}
    </>
  );
};


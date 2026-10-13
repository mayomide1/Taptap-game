import { useState, useRef, useEffect } from "react";
import axios from "axios";

const url = import.meta.env.VITE_API_URL;

const App = () => {
  const countLimit = 5000;
  const idleDelay = 1000; 
  const regenTickMs = 100; 
  const regenStep = countLimit / 600; // full refill in ~60s

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [count, setCount] = useState(0);
  const [totalCount, setTotalCount] = useState(() => {
    const stored = JSON.parse(localStorage.getItem("loggedPlayer"));
    return stored?.totalCount ?? 0;
  });
  const [is2x, setIs2x] = useState(false);
  const [creatingAcct, setCreatingAcct] = useState(false);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [loggedPlayer, setLoggedPlayer] = useState(
    () => JSON.parse(localStorage.getItem("loggedPlayer")) || null,
  );
  const [recharging, setRecharging] = useState(false);
  const [displayDiff, setDisplayDiff] = useState(countLimit);

  // Refs mirror the values that timers and page-leave listeners need,
  // so they never read stale state.
  const countRef = useRef(0);
  const totalCountRef = useRef(
    JSON.parse(localStorage.getItem("loggedPlayer"))?.totalCount ?? 0,
  );
  const playerRef = useRef(
    JSON.parse(localStorage.getItem("loggedPlayer")) || null,
  );
  const energyRef = useRef(countLimit);
  const idleTimer = useRef(null);
  const regenTimer = useRef(null);

  function updateTotal(value) {
    totalCountRef.current = value;
    setTotalCount(value);
  }

  function updatePlayer(value) {
    playerRef.current = value;
    setLoggedPlayer(value);
  }

  // Saves any unbanked taps. `leaving` uses fetch keepalive so the request
  // survives the tab being closed.
  function bank(leaving = false) {
    const pending = countRef.current;
    const player = playerRef.current;
    if (!pending || !player) return;

    const newTotal = totalCountRef.current + pending;
    countRef.current = 0;
    setCount(0);
    updateTotal(newTotal);

    const updated = { ...player, totalCount: newTotal };
    updatePlayer(updated);
    localStorage.setItem("loggedPlayer", JSON.stringify(updated));

    const endpoint = `${url}/user/${player._id}/count`;
    if (leaving) {
      fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalCount: newTotal }),
        keepalive: true,
      }).catch(() => {});
    } else {
      axios.patch(endpoint, { totalCount: newTotal }).catch((error) => {
        setMessage(error.response?.data?.error || "Could not save score");
      });
    }
  }

  function startRegen() {
    clearInterval(regenTimer.current);
    regenTimer.current = setInterval(() => {
      const next = Math.min(countLimit, energyRef.current + regenStep);
      energyRef.current = next;
      setDisplayDiff(next);

      if (next >= countLimit) {
        clearInterval(regenTimer.current);
        setRecharging(false);
      }
    }, regenTickMs);
  }

  // Save on tab close / switching away, and clean up timers on unmount
  useEffect(() => {
    const handleLeave = () => bank(true);
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") bank(true);
    };

    window.addEventListener("pagehide", handleLeave);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("pagehide", handleLeave);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearTimeout(idleTimer.current);
      clearInterval(regenTimer.current);
    };
  }, []);

  async function createAccount() {
    try {
      if (!userName || !password) {
        setMessage("All fields are required");
        return;
      }
      const response = await axios.post(`${url}/register`, {
        userName,
        password,
      });
      localStorage.setItem("loggedPlayer", JSON.stringify(response.data));
      setIsGameOpen(true);
      updatePlayer(response.data);
      setUserName("");
      setPassword("");
      setMessage("");
      updateTotal(response.data.totalCount);
    } catch (error) {
      if (error.response) {
        setMessage(error.response.data.error || "Something went wrong");
      } else {
        setMessage("Network error — please try again");
      }
    }
  }

  async function handleLogin() {
    if (!userName || !password) {
      setMessage("All fields are required");
      return;
    }
    try {
      const response = await axios.post(`${url}/login`, { userName, password });
      updatePlayer(response.data);
      localStorage.setItem("loggedPlayer", JSON.stringify(response.data));
      setIsGameOpen(true);
      setUserName("");
      setPassword("");
      setMessage("");
      updateTotal(response.data.totalCount);
    } catch (error) {
      setMessage(
        error.response?.data?.error || "Network error — please try again",
      );
    }
  }

  function logout() {
    clearTimeout(idleTimer.current);
    bank(); // save any taps that haven't been banked yet
    setIsGameOpen(false);
    updatePlayer(null);
    localStorage.removeItem("loggedPlayer");
  }

  function addTap() {
    if (recharging || !playerRef.current) return;

    clearTimeout(idleTimer.current);
    clearInterval(regenTimer.current);

    const increment = is2x ? 2 : 1;
    const available = Math.floor(energyRef.current);
    const gained = Math.min(increment, available);

    energyRef.current = available - gained;
    countRef.current += gained;
    setCount(countRef.current);
    setDisplayDiff(energyRef.current);

    if (energyRef.current <= 0) {
      // out of energy: save now, lock the button, refill
      setIs2x(false);
      setRecharging(true);
      bank();
      startRegen();
    } else {
      // user stopped tapping: save and start refilling
      idleTimer.current = setTimeout(() => {
        bank();
        startRegen();
      }, idleDelay);
    }
  }

  return (
    <>
      <div className="app">
        <div className="phone">
          <header className="topbar">
            <h2 className="topbar-title">Tap Tap</h2>
            <div className="auth">
              <button
                className="badge"
                onClick={() => {
                  isGameOpen ? logout() : setCreatingAcct((prev) => !prev);
                }}
              >
                {isGameOpen
                  ? "Logout"
                  : creatingAcct
                    ? "Login"
                    : "Create Account"}
              </button>
            </div>
          </header>

          {!isGameOpen && !loggedPlayer && (
            <main className="screen screen-center">
              <div className="signup">
                <p className="error-message">{message}</p>
                <input
                  className="signup-input"
                  type="text"
                  placeholder={
                    creatingAcct
                      ? "Create your username"
                      : "Enter your username"
                  }
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
                <input
                  className="signup-input"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="btn btn-primary"
                  onClick={creatingAcct ? createAccount : handleLogin}
                >
                  {creatingAcct ? "Create Account" : "Login"}
                </button>
              </div>
            </main>
          )}

          {!isGameOpen && loggedPlayer && (
            <div className="screen">
              <p>Signed in as @{loggedPlayer.userName}</p>
              <button
                className="btn btn-primary"
                onClick={() => setIsGameOpen(true)}
              >
                Continue
              </button>
              <button className="btn btn-primary" onClick={() => logout()}>
                Logout
              </button>
            </div>
          )}

          {isGameOpen && (
            <main className="screen">
              <div>
                <p className="greeting">@{loggedPlayer.userName}</p>
              </div>

              <div className="score-block">
                <div className="score">{totalCount + count}</div>
                <p className="score-label">Tap the sun</p>
                <p className="limit">
                  {Math.floor(displayDiff)} / {countLimit}
                </p>
              </div>

              <div className="sun-wrap">
                <button className="sun" onClick={addTap} disabled={recharging}>
                  <span className="sun-text">TAP</span>
                </button>
              </div>

              <footer className="actions">
                <button
                  className={`btn btn-boost ${is2x ? "active" : ""}`}
                  onClick={() => setIs2x(!is2x)}
                >
                  2× taps
                </button>
                <button className="btn btn-board">🏆 Board</button>
              </footer>
            </main>
          )}
        </div>
      </div>
    </>
  );
};

export default App;

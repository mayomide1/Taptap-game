import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import "./src/Admin.css"

const url = import.meta.env.VITE_API_URL;

const Admin = () => {
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function renderAllUsers() {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get(`${url}/players`);
      setAllPlayers(response.data);
    } catch (error) {
      console.error(error.message);
      setError("Could not load players. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    renderAllUsers();
  }, []);

async function deleteUser(id) {
  if (!id) {
    console.error("No player id");
    return;
  }
  if (!window.confirm("Delete this player?")) return;

  try {
    await axios.delete(`${url}/player/${id}`);
    setAllPlayers((prev) => prev.filter((p) => p._id !== id));
  } catch (err) {
    console.error(err.message);
    setError("Could not delete player.");
  }
}


  const totalPoints = allPlayers.reduce(
    (sum, player) => sum + (player.totalCount || 0),
    0
  );
  const topScore = allPlayers.reduce(
    (max, player) => Math.max(max, player.totalCount || 0),
    0
  );

  // Sort by points (highest first) and filter by search text
  const visiblePlayers = useMemo(() => {
    return [...allPlayers]
      .sort((a, b) => (b.totalCount || 0) - (a.totalCount || 0))
      .filter((player) =>
        (player.userName || "").toLowerCase().includes(search.toLowerCase())
      );
  }, [allPlayers, search]);

  return (
    <div className="admin-page">
      <div className="admin-card">
        {/* Header */}
        <div className="admin-header">
          <h2 className="admin-title">Admin Dashboard</h2>
          <button className="admin-refresh" onClick={renderAllUsers}>
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="admin-stats">
          <div className="stat-box">
            <span className="stat-value">{allPlayers.length}</span>
            <span className="stat-label">Total Players</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{totalPoints}</span>
            <span className="stat-label">Total Points</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{topScore}</span>
            <span className="stat-label">Top Score</span>
          </div>
        </div>

        {/* Search */}
        <input
          className="admin-search"
          type="text"
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Player list */}
        <div className="player-list">
          {loading && <p className="admin-message">Loading players...</p>}

          {error && <p className="admin-message admin-error">{error}</p>}

          {!loading && !error && visiblePlayers.length === 0 && (
            <p className="admin-message">No players found.</p>
          )}

          {!loading &&
            !error &&
            visiblePlayers.map((player, index) => (
              <div className="player-row" key={player._id || player.userName}>
                <span className="player-rank">#{index + 1}</span>
                <span className="player-name">{player.userName}</span>
                <span className="player-points">
                  {player.totalCount} <small>pts</small>
                </span>
                <button className="admin-refresh" onClick={() => deleteUser(player._id)}>Delete</button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Admin;

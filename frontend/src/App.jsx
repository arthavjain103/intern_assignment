import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";

const API_BASE = "http://localhost:8000/api";

// Authentication helper functions
const authHelpers = {
  getToken: () => localStorage.getItem('accessToken'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  setTokens: (access, refresh) => {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  },
  clearTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
  },
  getAuthHeaders: () => {
    const token = authHelpers.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
};

// Karma animation component
function KarmaGain({ value, onComplete }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.5 }}
      animate={{ opacity: [0, 1, 1, 0], y: -50, scale: [0.5, 1.2, 1] }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      onAnimationComplete={onComplete}
      className="karma-gain"
    >
      +{value}
    </motion.div>
  );
}

// Login/Register Modal
function AuthModal({ onClose, onSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? 'auth/login/' : 'auth/register/';
    const body = isLogin 
      ? { username: formData.username, password: formData.password }
      : formData;

    try {
      const response = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok) {
        authHelpers.setTokens(data.tokens.access, data.tokens.refresh);
        authHelpers.setUser(data.user);
        onSuccess(data.user);
      } else {
        setError(data.error || Object.values(data)[0] || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="auth-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>×</button>
        
        <h2 className="auth-title">{isLogin ? 'SIGN IN' : 'JOIN ARENA'}</h2>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="text"
            placeholder="Username"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            required
            className="auth-input"
          />
          
          {!isLogin && (
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              className="auth-input"
            />
          )}
          
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
            minLength={6}
            className="auth-input"
          />
          
          {error && <div className="auth-error">{error}</div>}
          
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Register')}
          </button>
        </form>
        
        <div className="auth-toggle">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }} className="auth-toggle-btn">
            {isLogin ? 'Register' : 'Sign In'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Comment component with threading
function Comment({ c, depth = 0, onLike, currentUser, postId, onReplySubmit }) {
  const [showKarma, setShowKarma] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [likeCount, setLikeCount] = useState(c.like_count || 0);

  const handleLike = async () => {
    if (isLiked || !currentUser) return;

    try {
      const response = await fetch(`${API_BASE}/comments/${c.id}/like/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHelpers.getAuthHeaders()
        },
      });

      if (response.ok) {
        setIsLiked(true);
        setShowKarma(true);
        setLikeCount(likeCount + 1);
        if (onLike) onLike();
      }
    } catch (err) {
      console.error("Error liking comment:", err);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/comments/create/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHelpers.getAuthHeaders()
        },
        body: JSON.stringify({
          post: postId,
          parent: c.id,
          content: replyContent,
        }),
      });

      if (response.ok) {
        setReplyContent("");
        setShowReply(false);
        if (onReplySubmit) onReplySubmit();
      } else {
        const errorData = await response.json();
        console.error("Error posting reply:", errorData);
        alert("Error posting reply. Please try again.");
      }
    } catch (err) {
      console.error("Error posting reply:", err);
      alert("Error posting reply. Please check your connection.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="comment"
      style={{
        marginLeft: depth * 24,
        borderLeft: depth > 0 ? "2px solid rgba(255, 107, 0, 0.2)" : "none",
        paddingLeft: depth > 0 ? 16 : 0,
        marginTop: 12,
        position: "relative",
      }}
    >
      <div className="comment-header">
        <span className="comment-author">{c.author.username}</span>
        <span className="comment-time">
          {new Date(c.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <div className="comment-content">{c.content}</div>
      <div className="comment-actions">
        <button
          className={`like-btn ${isLiked ? "liked" : ""}`}
          onClick={handleLike}
          disabled={isLiked || !currentUser}
          style={{ position: "relative" }}
        >
          <span className="like-icon">▲</span>
          <span className="like-count">{likeCount}</span>
          {showKarma && (
            <KarmaGain value={1} onComplete={() => setShowKarma(false)} />
          )}
        </button>
        {currentUser && (
          <button className="reply-btn" onClick={() => setShowReply(!showReply)}>
            ↩ Reply
          </button>
        )}
      </div>

      {showReply && currentUser && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="reply-form"
          onSubmit={handleReplySubmit}
        >
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            className="reply-input"
            rows={3}
          />
          <div className="reply-form-actions">
            <button
              type="button"
              onClick={() => setShowReply(false)}
              className="cancel-btn"
            >
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Post Reply
            </button>
          </div>
        </motion.form>
      )}

      {c.children && c.children.length > 0 && (
        <div className="comment-children">
          {c.children.map((child) => (
            <Comment
              key={child.id}
              c={child}
              depth={depth + 1}
              onLike={onLike}
              currentUser={currentUser}
              postId={postId}
              onReplySubmit={onReplySubmit}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// Post card component
function PostCard({ post, onView, onLike, index, currentUser }) {
  const [showKarma, setShowKarma] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const handleLike = async (e) => {
    e.stopPropagation();
    if (isLiked || !currentUser) return;

    try {
      const response = await fetch(`${API_BASE}/posts/${post.id}/like/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHelpers.getAuthHeaders()
        },
      });

      if (response.ok) {
        setIsLiked(true);
        setShowKarma(true);
        if (onLike) onLike();
      }
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="post-card"
      onClick={() => onView(post.id)}
    >
      <div className="post-header">
        <span className="post-author">{post.author.username}</span>
        <span className="post-time">
          {new Date(post.created_at).toLocaleDateString()}
        </span>
      </div>
      <div className="post-content">{post.content}</div>
      <div className="post-footer">
        <button
          className={`like-btn ${isLiked ? "liked" : ""}`}
          onClick={handleLike}
          disabled={isLiked || !currentUser}
          style={{ position: "relative" }}
        >
          <span className="like-icon">▲</span>
          <span className="like-count">{post.like_count || 0}</span>
          {showKarma && (
            <KarmaGain value={5} onComplete={() => setShowKarma(false)} />
          )}
        </button>
        <span className="comment-count">💬 {post.comment_count || 0}</span>
      </div>
    </motion.div>
  );
}

// Leaderboard component
function Leaderboard({ data }) {
  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <h2>LEADERBOARD</h2>
        <span className="leaderboard-subtitle">24H KARMA</span>
      </div>
      <div className="leaderboard-list">
        {data.length > 0 ? (
          data.map((user, idx) => (
            <motion.div
              key={user.user_id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
              className={`leaderboard-item top-${idx + 1}`}
            >
              <div className="item-left">
                <div className="rank-badge">#{idx + 1}</div>
                <div className="username">{user.username}</div>
              </div>
              <div className="karma-points">{user.karma}</div>
            </motion.div>
          ))
        ) : (
          <div className="empty-state">No karma yet</div>
        )}
      </div>
    </div>
  );
}

// Create Post Modal
function CreatePostModal({ onClose, onSubmit }) {
  const [content, setContent] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content);
      setContent("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="create-post-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>CREATE POST</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="post-textarea"
            rows={6}
            autoFocus
          />
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={!content.trim()}>
              Post
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// Main App Component
function App() {
  const [posts, setPosts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(authHelpers.getUser());

  useEffect(() => {
    loadData();
    // Try to refresh user data if token exists
    if (authHelpers.getToken()) {
      fetchCurrentUser();
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/me/`, {
        headers: authHelpers.getAuthHeaders()
      });
      if (response.ok) {
        const user = await response.json();
        authHelpers.setUser(user);
        setCurrentUser(user);
      } else {
        // Token might be expired
        handleLogout();
      }
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  };

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/posts/`).then((r) => r.json()),
      fetch(`${API_BASE}/leaderboard/`).then((r) => r.json()),
    ])
      .then(([postsData, leaderboardData]) => {
        setPosts(postsData.results || postsData);
        setLeaderboard(leaderboardData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching data:", err);
        setLoading(false);
      });
  };

  const viewPost = (id) => {
    fetch(`${API_BASE}/posts/${id}/`)
      .then((r) => r.json())
      .then(setSelected)
      .catch((err) => console.error("Error fetching post:", err));
  };

  const handleCreatePost = async (content) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/posts/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHelpers.getAuthHeaders()
        },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        setShowCreatePost(false);
        loadData();
      } else if (response.status === 401) {
        handleLogout();
        setShowAuthModal(true);
      } else {
        const errorData = await response.json();
        console.error("Error creating post:", errorData);
        alert("Error creating post. Please try again.");
      }
    } catch (err) {
      console.error("Error creating post:", err);
      alert("Error creating post. Please check your connection.");
    }
  };

  const handleCommentSubmit = async (content) => {
    if (!selected || !currentUser) return;

    try {
      const response = await fetch(`${API_BASE}/comments/create/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHelpers.getAuthHeaders()
        },
        body: JSON.stringify({
          post: selected.id,
          content,
        }),
      });

      if (response.ok) {
        viewPost(selected.id);
        loadData();
      } else if (response.status === 401) {
        handleLogout();
        setShowAuthModal(true);
      } else {
        const errorData = await response.json();
        console.error("Error posting comment:", errorData);
        alert("Error posting comment. Please try again.");
      }
    } catch (err) {
      console.error("Error posting comment:", err);
      alert("Error posting comment. Please check your connection.");
    }
  };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    authHelpers.clearTokens();
    setCurrentUser(null);
  };

  const handleNewPostClick = () => {
    if (!currentUser) {
      setShowAuthModal(true);
    } else {
      setShowCreatePost(true);
    }
  };

  return (
    <div className="app">
      {/* Background effects */}
      <div className="bg-gradient"></div>
      <div className="bg-grid"></div>
      <div className="bg-noise"></div>

      {/* Header */}
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">CommunityMaster</span>
        </div>
        <button
          className="create-post-btn"
          onClick={handleNewPostClick}
        >
          <span className="plus-icon">+</span>
          <span>New Post</span>
        </button>
        <div className="user-badge">
          {currentUser ? (
            <div className="user-menu">
              <span className="user-name">{currentUser.username}</span>
              <button onClick={handleLogout} className="logout-btn">Logout</button>
            </div>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="login-btn">
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="app-content">
        {/* Feed sidebar */}
        <aside className="feed-sidebar">
          <div className="sidebar-header">
            <h2>FEED</h2>
            <button className="refresh-btn" onClick={loadData}>
              ↻
            </button>
          </div>
          <div className="posts-list">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : posts.length > 0 ? (
              posts.map((p, idx) => (
                <PostCard
                  key={p.id}
                  post={p}
                  onView={viewPost}
                  onLike={loadData}
                  index={idx}
                  currentUser={currentUser}
                />
              ))
            ) : (
              <div className="empty-state">No posts yet</div>
            )}
          </div>
        </aside>

        {/* Main post view */}
        <main className="main-view">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="post-detail"
              >
                <button className="back-btn" onClick={() => setSelected(null)}>
                  ← Back
                </button>
                <div className="post-detail-header">
                  <h1 className="post-detail-author">
                    {selected.author.username}
                  </h1>
                  <span className="post-detail-time">
                    {new Date(selected.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="post-detail-content">{selected.content}</p>
                <div className="post-detail-stats">
                  <span className="stat">▲ {selected.like_count} likes</span>
                  <span className="stat">
                    💬 {selected.comments.length} comments
                  </span>
                </div>

                {/* Add Comment Form */}
                {currentUser ? (
                  <CommentForm onSubmit={handleCommentSubmit} />
                ) : (
                  <div className="auth-prompt">
                    <button onClick={() => setShowAuthModal(true)} className="auth-prompt-btn">
                      Sign in to comment
                    </button>
                  </div>
                )}

                <div className="comments-section">
                  <h3 className="comments-title">DISCUSSION</h3>
                  {selected.comments.length > 0 ? (
                    <div className="comments-list">
                      {selected.comments.map((c) => (
                        <Comment
                          key={c.id}
                          c={c}
                          onLike={loadData}
                          currentUser={currentUser}
                          postId={selected.id}
                          onReplySubmit={() => viewPost(selected.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      No comments yet. Be the first!
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="empty-main"
              >
                <div className="empty-icon">⚡</div>
                <h2>Select a post to view</h2>
                <p>Choose from the feed to see full discussion</p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Leaderboard */}
        <aside className="leaderboard-sidebar">
          <Leaderboard data={leaderboard} />
        </aside>
      </div>

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreatePost && (
          <CreatePostModal
            onClose={() => setShowCreatePost(false)}
            onSubmit={handleCreatePost}
          />
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal
            onClose={() => setShowAuthModal(false)}
            onSuccess={handleAuthSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Comment Form Component
function CommentForm({ onSubmit }) {
  const [content, setContent] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content);
      setContent("");
    }
  };

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a comment..."
        className="comment-input"
        rows={3}
      />
      <button type="submit" className="submit-btn" disabled={!content.trim()}>
        Post Comment
      </button>
    </form>
  );
}

export default App;
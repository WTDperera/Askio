// Lightweight fetch wrapper + grouped endpoint helpers.
// Unify base URL resolution: prefer VITE_API_URL (new), then fallback to VITE_API_BASE, then localhost.
const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:4000';

// Axios instance (optional usage) – added per request.
// withCredentials can be left true if you later use cookies; current auth uses Bearer tokens.
// Exported as axiosClient for clarity so it doesn't shadow default export at bottom.
import axios from 'axios';
export const axiosClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

async function request(path, { method = 'GET', body, token, headers = {} } = {}) {
  const isFormData = (typeof FormData !== 'undefined') && body instanceof FormData;
  const finalHeaders = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
  if (!isFormData && body) finalHeaders['Content-Type'] = 'application/json';
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.status === 204 ? null : res.json();
}

export const postsApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/posts${qs ? `?${qs}` : ''}`);
  },
  create: (data, token) => request('/api/posts', { method: 'POST', body: data, token }),
  like: (id, token) => request(`/api/posts/${id}/like`, { method: 'POST', token }),
  comment: (id, content, token) => request(`/api/posts/${id}/comments`, { method: 'POST', body: { content }, token }),
  deleteComment: (postId, commentId, token) => request(`/api/posts/${postId}/comments/${commentId}`, { method: 'DELETE', token }),
  update: (id, data, token) => request(`/api/posts/${id}`, { method: 'PATCH', body: data, token }),
  delete: (id, token) => request(`/api/posts/${id}`, { method: 'DELETE', token })
};

export const storiesApi = {
  list: () => request('/api/stories'),
  create: (data, token) => request('/api/stories', { method: 'POST', body: data, token }),
  delete: (id, token) => request(`/api/stories/${id}`, { method: 'DELETE', token }),
  update: (id, data, token) => request(`/api/stories/${id}`, { method: 'PATCH', body: data, token })
};

export const usersApi = {
  me: (token) => request('/api/users/me', { token }),
  updateMe: (data, token) => request('/api/users/me', { method: 'PATCH', body: data, token }),
  uploadCover: (file, token) => {
    const fd = new FormData();
    fd.append('cover', file);
    return request('/api/users/me/cover', { method: 'POST', body: fd, token });
  },
  get: (id, token) => request(`/api/users/${id}`, { token }),
  posts: (id, token) => request(`/api/users/${id}/posts`, { token }),
  search: (q) => request(`/api/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  follow: (id, token) => request(`/api/users/${id}/follow`, { method: 'POST', token }),
  unfollow: (id, token) => request(`/api/users/${id}/follow`, { method: 'DELETE', token }),
  followers: (id) => request(`/api/users/${id}/followers`),
  following: (id) => request(`/api/users/${id}/following`)
};

export const messagesApi = {
  conversations: (token) => request('/api/messages/conversations', { token }),
  listWith: (peerId, token) => request(`/api/messages/with/${peerId}`, { token }),
  send: (peerId, data, token) => request(`/api/messages/with/${peerId}`, { method: 'POST', body: data, token }),
  markSeen: (peerId, token) => request(`/api/messages/with/${peerId}/seen`, { method: 'POST', token })
};

export const notificationsApi = {
  list: (params = {}, token) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/notifications${qs ? `?${qs}` : ''}`, { token });
  },
  readAll: (token) => request('/api/notifications/read-all', { method: 'POST', token }),
  markRead: (id, token) => request(`/api/notifications/${id}/read`, { method: 'POST', token })
};

// Utility to wrap API objects with automatic Clerk token retrieval
export function withClerk(auth) {
  async function authed(fn) {
    const token = await auth.getToken();
    return fn(token);
  }
  return {
    posts: {
      list: (params) => postsApi.list(params), // public
      create: (data) => authed(t => postsApi.create(data, t)),
      like: (id) => authed(t => postsApi.like(id, t)),
      comment: (id, content) => authed(t => postsApi.comment(id, content, t)),
  deleteComment: (postId, commentId) => authed(t => postsApi.deleteComment(postId, commentId, t)),
    },
    stories: {
      list: () => storiesApi.list(),
      create: (data) => authed(t => storiesApi.create(data, t)),
  delete: (id) => authed(t => storiesApi.delete(id, t)),
  update: (id, data) => authed(t => storiesApi.update(id, data, t))
    },
    users: {
      me: () => authed(t => usersApi.me(t)),
      updateMe: (data) => authed(t => usersApi.updateMe(data, t)),
  uploadCover: (file) => authed(t => usersApi.uploadCover(file, t)),
      get: (id) => usersApi.get(id), // public
  posts: (id) => usersApi.posts(id),
  search: (q) => usersApi.search(q),
  follow: (id) => authed(t => usersApi.follow(id, t)),
  unfollow: (id) => authed(t => usersApi.unfollow(id, t)),
  followers: (id) => usersApi.followers(id),
  following: (id) => usersApi.following(id)
  },
  messages: {
      conversations: () => authed(t => messagesApi.conversations(t)),
      listWith: (peerId) => authed(t => messagesApi.listWith(peerId, t)),
      send: (peerId, data) => authed(t => messagesApi.send(peerId, data, t)),
      markSeen: (peerId) => authed(t => messagesApi.markSeen(peerId, t))
    }
    ,
    notifications: {
      list: (params) => authed(t => notificationsApi.list(params, t)),
      readAll: () => authed(t => notificationsApi.readAll(t)),
      markRead: (id) => authed(t => notificationsApi.markRead(id, t))
    }
  };
}

export default { postsApi, storiesApi, usersApi, messagesApi, notificationsApi, withClerk };

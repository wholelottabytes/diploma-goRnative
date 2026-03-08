import client from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
}

export const authApi = {
  login: (data: LoginPayload) => client.post('/auth/login', data),
  register: (data: RegisterPayload) => client.post('/auth/register', data),
  refresh: () => client.post('/auth/refresh'),
};

export const userApi = {
  getProfile: (id: string) => client.get(`/users/${id}`),
  updateProfile: (id: string, data: object) => client.put(`/users/${id}`, data),
  changePassword: (data: object) => client.patch('/users/me/password', data),
  getUserById: (id: string) => client.get(`/users/${id}`),
};

export const beatApi = {
  getAll: (params?: object) => client.get('/beats', { params }),
  getById: (id: string) => client.get(`/beats/${id}`),
  create: (data: object) => client.post('/beats', data),
  update: (id: string, data: object) => client.put(`/beats/${id}`, data),
  delete: (id: string) => client.delete(`/beats/${id}`),
  search: (query: string) => client.get('/beats', { params: { q: query } }),
  getMyBeats: () => client.get('/beats/my'),
  getLiked: () => client.get('/beats/liked'),
  getBatch: (ids: string[]) => client.post('/beats/batch', { ids }),
};

export const interactionApi = {
  addComment: (beatId: string, text: string) =>
    client.post('/interactions/comments', { beat_id: beatId, text }),
  getComments: (beatId: string) =>
    client.get(`/interactions/beats/${beatId}/comments`),
  rateBeat: (beatId: string, value: number) =>
    client.post('/interactions/ratings', { beat_id: beatId, value }),
  getRating: (beatId: string) =>
    client.get(`/interactions/beats/${beatId}/rating`),
  getUserRating: (beatId: string) =>
    client.get(`/interactions/beats/${beatId}/rating/me`),
  getLikedIDs: (userId: string) =>
    client.get(`/interactions/users/${userId}/liked`),
  updateComment: (commentId: string, text: string) =>
    client.put(`/interactions/comments/${commentId}`, { text }),
  deleteComment: (commentId: string) =>
    client.delete(`/interactions/comments/${commentId}`),
};

export const orderApi = {
  buyBeat: (beatId: string) => client.post('/orders/buy', { beat_id: beatId }),
  getOrders: () => client.get('/orders'),
  checkPurchase: (beatId: string) => client.get(`/orders/has-purchased/${beatId}`),
};

export const walletApi = {
  getBalance: () => client.get('/wallets/balance'),
  getTransactions: () => client.get('/wallets/transactions'),
  topUp: (amount: number) => client.post('/wallets/topup', { amount }),
};

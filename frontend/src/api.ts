import axios, { AxiosRequestHeaders, AxiosResponse } from 'axios';
import { LoginResponse, RecordListResponse, RecordResponse, RefreshResponse, User } from './types';

export class Api {
  constructor(root = '') {
    axios.defaults.xsrfCookieName = 'csrftoken';
    axios.defaults.xsrfHeaderName = 'X-CSRFToken';
    axios.defaults.baseURL = root;
  }

  // currentUser: User | null = { pk: 1, username: 'admin' };
  // private _currentUser: User | null = null;
  private get currentUser(): User | null {
    if (sessionStorage.getItem('profile') === null) return null
    else return JSON.parse(sessionStorage.getItem('profile')!);
  }
  
  private set currentUser(value: User | null) {
    if (value === null) sessionStorage.removeItem('profile');
    else sessionStorage.setItem('profile', JSON.stringify(value));
  }
  
  private _authToken: string | null = null;
  private get authToken(): Promise<string | null> {
    return new Promise(async (resolve, reject) => {
      if (this.currentUser?.is_anonymous ?? true) {
        resolve(null);
      } else if (this._authToken === null) {
        try {
          const { access } = await this.tokenRefresh()
          this.setAuthToken(access);
          resolve(access);
        } catch {
          resolve(null);
        }
      } else {
        resolve(this._authToken);
      }
    })
  }

  private get headers(): Promise<AxiosRequestHeaders> {
    return new Promise(async (resolve, reject) => {
      const token = await this.authToken;
      const h: AxiosRequestHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
      resolve(h);
    })
  }

  private setAuthToken(token: string | null, expiration?: string | null) {
    const expiryTime = token ? JSON.parse(atob(token.split('.')[1])).exp * 1000 : Date.now();
    const timeDelta = expiryTime - Date.now();

    if (timeDelta > 50) {
      this._authToken = token;
      setTimeout(() => {
        this._authToken = null;
      }, timeDelta - 50);
    }
  }

  async authLogin(username: string, password: string) {
    const result = await axios.post('/auth/login/', {
      username: username,
      password: password,
    });
    
    const data = result.data as LoginResponse;
    this.setAuthToken(data.access_token);
    this.currentUser = data.user;
    return data;
  }

  private async tokenRefresh() {
    const result = await axios.post('/auth/token/refresh/');
    return result.data as RefreshResponse;
  }

  async authLogout() {
    const result = await axios.post('/auth/logout/', { headers: await this.headers });

    this.setAuthToken(null);
    this.currentUser = null;

    return result.data as LoginResponse;
  }
    
  async getCurrentUser() {
    const result = await axios.get('/auth/user/', { headers: await this.headers });
    
    return result.data as User;
  }

  async getRecordsList(search?: string) {
    const searchString = (search && search !== '') ? '?search=' + search : ''
    const result = await axios.get(`/records${searchString}`, { headers: await this.headers });

    return result.data as RecordListResponse;
  }

  async getRecordDetails(id: string) {
    const result = await axios.get(`/records/${id}`, { headers: await this.headers });
    
    return result.data as RecordResponse;
  }

  async createRecord(contents?: string) {
    const result = await axios.post('/records', {
      contents: contents ?? "",
    }, { headers: await this.headers });

    return result.data as RecordResponse;
  }

  async deleteRecord(id: string) {
    const result = await axios.delete(`/records/${id}`, { headers: await this.headers });
    return result.data as AxiosResponse;
  }

  async editRecord(id: string, newContents: string) {
    const result = await axios.put(`/records/${id}`, {
      contents: newContents,
    }, { headers: await this.headers });

    return result.data as RecordResponse;
  }
}

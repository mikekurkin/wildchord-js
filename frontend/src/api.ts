import axios, { AxiosInstance, AxiosRequestHeaders, AxiosResponse } from 'axios';
import { LoginResponse, RecordListResponse, RecordResponse, RefreshResponse, User } from './types';

export class Api {
  private ax: AxiosInstance;

  constructor(root = '') {
    this.ax = axios.create({
      baseURL: root,
      withCredentials: true,
    });
  }

  private get currentUser(): User | null {
    return JSON.parse(localStorage.getItem('profile') ?? 'null');
  }

  private set currentUser(value: User | null) {
    const oldValue = localStorage.getItem('profile');
    const newValue = JSON.stringify(value);
    if (value === null) localStorage.removeItem('profile');
    else localStorage.setItem('profile', newValue);
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'profile',
        oldValue: oldValue,
        newValue: value && newValue,
        storageArea: window.localStorage,
        url: window.location.toString(),
      })
    );
  }

  private _authToken: string | null = null;
  private get authToken(): Promise<string | null> {
    return new Promise(async (resolve, reject) => {
      if (this.currentUser?.is_anonymous ?? true) {
        resolve(null);
      } else if (this._authToken === null) {
        try {
          const { access } = await this.tokenRefresh();
          this.setAuthToken(access);
          resolve(access);
        } catch {
          resolve(null);
        }
      } else {
        resolve(this._authToken);
      }
    });
  }

  private get headers(): Promise<AxiosRequestHeaders> {
    return new Promise(async (resolve, reject) => {
      const token = await this.authToken;
      const h: AxiosRequestHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      resolve(h);
    });
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

  async authRegister(username: string, password: string, confirmation: string) {
    const {
      data: { access_token, user },
    } = (await this.ax.post('/auth/register/', {
      username: username,
      password1: password,
      password2: confirmation,
    })) as AxiosResponse<LoginResponse>;

    this.setAuthToken(access_token);
    this.currentUser = user;
  }

  async authLogin(username: string, password: string) {
    const {
      data: { access_token, user },
    } = (await this.ax.post('/auth/login/', {
      username: username,
      password: password,
    })) as AxiosResponse<LoginResponse>;

    this.setAuthToken(access_token);
    this.currentUser = user;
  }

  private async tokenRefresh() {
    const { data } = await this.ax.post('/auth/token/refresh/');
    return data as RefreshResponse;
  }

  async authLogout() {
    const { data } = await this.ax.post('/auth/logout/', { headers: await this.headers });

    this.setAuthToken(null);
    this.currentUser = null;

    return data as LoginResponse;
  }

  async authChangePass(oldPassword: string, newPassword: string, confirmation: string) {
    await this.ax.post(
      '/auth/password/change/',
      {
        old_password: oldPassword,
        new_password1: newPassword,
        new_password2: confirmation,
      },
      { headers: await this.headers }
    );
  }

  async getCurrentUser() {
    const { data } = await this.ax.get('/auth/user/', { headers: await this.headers });
    return data as User;
  }

  async getRecordsList(search?: string, page?: number) {
    let params = new URLSearchParams();
    if (search) params.append('search', search);
    if (page) params.append('page', page.toString());
    const paramString = params.toString();
    const requestURL = `/records${paramString === '' ? '' : `?${paramString}`}`;
    // const searchString = search && search !== '' ? '?search=' + search : '';
    const { data } = await this.ax.get(requestURL, { headers: await this.headers });

    return data as RecordListResponse;
  }

  async getRecordDetails(id: string) {
    const { data } = await this.ax.get(`/records/${id}`, { headers: await this.headers });
    return data as RecordResponse;
  }

  async createRecord(contents?: string) {
    const { data } = await this.ax.post('/records', { contents: contents ?? '' }, { headers: await this.headers });
    return data as RecordResponse;
  }

  async deleteRecord(id: string) {
    const { data } = await this.ax.delete(`/records/${id}`, { headers: await this.headers });
    return data as AxiosResponse;
  }

  async editRecord(id: string, newContents: string) {
    const { data } = await this.ax.patch(`/records/${id}`, { contents: newContents }, { headers: await this.headers });
    return data as RecordResponse;
  }

  async setPublic(id: string, make_public: boolean) {
    const { data } = await this.ax.patch(`/records/${id}`, { is_public: make_public }, { headers: await this.headers });
    return data as RecordResponse;
  }
}

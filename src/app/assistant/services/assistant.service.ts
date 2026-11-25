import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface ChatResponse {
  response: string;
  intent?: string;
  confidence?: number;
  model_version?: string;
  guest_session_token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AssistantService {

  // ============================================
  // LOCAL BACKEND
  // ============================================
  // private BASE_URL = 'http://127.0.0.1:5000/api/v1/assistant';

  // ============================================
  // PRODUCTION BACKEND
  // ============================================
  private BASE_URL = 'https://assistant-service-g24j.onrender.com/api/v1/assistant';

  private readonly GUEST_SESSION_STORAGE_KEY = 'assistant_guest_session_token';

  constructor(private http: HttpClient) {}

  sendMessage(message: string): Observable<ChatResponse> {
    // The Auth-Service stores its access token under the "token" key.
    const token = localStorage.getItem('token')?.trim();
    const hasAccessToken = !!token && token !== 'null' && token !== 'undefined';

    const payload: { message: string; guest_session_token?: string } = {
      message
    };
    let headers = new HttpHeaders();

    if (hasAccessToken) {
      headers = headers.set('Authorization', `Bearer ${token}`);
      // Do not carry a guest conversation into an authenticated session.
      sessionStorage.removeItem(this.GUEST_SESSION_STORAGE_KEY);
    } else {
      const guestSessionToken = sessionStorage.getItem(this.GUEST_SESSION_STORAGE_KEY);
      if (guestSessionToken) {
        payload.guest_session_token = guestSessionToken;
      }
    }

    return this.http.post<ChatResponse>(
      `${this.BASE_URL}/chat`,
      payload,
      { headers }
    ).pipe(
      tap((response) => {
        if (!hasAccessToken && response.guest_session_token) {
          sessionStorage.setItem(
            this.GUEST_SESSION_STORAGE_KEY,
            response.guest_session_token
          );
        }
      })
    );
  }
}

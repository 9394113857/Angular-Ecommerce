import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { AssistantService } from './assistant.service';

describe('AssistantService', () => {
  let service: AssistantService;
  let httpMock: HttpTestingController;
  const guestStorageKey = 'assistant_guest_session_token';
  const chatUrl = 'https://assistant-service-g24j.onrender.com/api/v1/assistant/chat';

  beforeEach(() => {
    localStorage.removeItem('token');
    sessionStorage.removeItem(guestStorageKey);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(AssistantService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('token');
    sessionStorage.removeItem(guestStorageKey);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should save the server-issued guest token and send it with later messages', () => {
    service.sendMessage('Hi').subscribe();

    const firstRequest = httpMock.expectOne(chatUrl);
    expect(firstRequest.request.method).toBe('POST');
    expect(firstRequest.request.body).toEqual({ message: 'Hi' });
    expect(firstRequest.request.headers.has('Authorization')).toBeFalse();
    firstRequest.flush({
      response: 'Hello',
      guest_session_token: 'guest-token-123'
    });

    expect(sessionStorage.getItem(guestStorageKey)).toBe('guest-token-123');

    service.sendMessage('Show products').subscribe();

    const secondRequest = httpMock.expectOne(chatUrl);
    expect(secondRequest.request.body).toEqual({
      message: 'Show products',
      guest_session_token: 'guest-token-123'
    });
    secondRequest.flush({ response: 'Products' });
  });

  it('should use the authenticated token and clear any guest token', () => {
    localStorage.setItem('token', 'access-token-456');
    sessionStorage.setItem(guestStorageKey, 'old-guest-token');

    service.sendMessage('Show my orders').subscribe();

    const request = httpMock.expectOne(chatUrl);
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token-456');
    expect(request.request.body).toEqual({ message: 'Show my orders' });
    expect(sessionStorage.getItem(guestStorageKey)).toBeNull();
    request.flush({ response: 'Please login' });
  });
});

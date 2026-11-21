import { Component } from '@angular/core';
import { AssistantService } from '../services/assistant.service';

interface ProductCard {
  name: string;
  price: string;
  category?: string;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  products?: ProductCard[];
}

@Component({
  selector: 'app-chat-widget',
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.css']
})
export class ChatWidgetComponent {
  isOpen = false;
  inputMessage = '';
  messages: Message[] = [];
  loading = false;

  constructor(private assistantService: AssistantService) {}

  toggleChat(): void {
    this.isOpen = !this.isOpen;
  }

  sendSuggestion(message: string): void {
    this.inputMessage = message;
    this.sendMessage();
  }

  sendMessage(): void {
    const message = this.inputMessage.trim();

    if (!message || this.loading) {
      return;
    }

    this.messages.push({
      role: 'user',
      text: message,
      timestamp: new Date()
    });

    this.inputMessage = '';
    this.loading = true;

    let userId: number | null = null;
    const userLoggedIn = localStorage.getItem('userLoggedIn');

    if (userLoggedIn) {
      userId = 1; // Preserve the existing demo user mapping.
    }

    this.assistantService.sendMessage(userId, message).subscribe({
      next: (response) => {
        this.messages.push(this.createAssistantMessage(response.response));
        this.loading = false;
      },
      error: () => {
        this.messages.push({
          role: 'assistant',
          text: 'I’m having trouble connecting right now. Please try again in a moment.',
          timestamp: new Date()
        });
        this.loading = false;
      }
    });
  }

  formatPrice(price: string): string {
    const amount = Number(String(price).replace(/[^\d.-]/g, ''));

    if (!Number.isFinite(amount)) {
      return price;
    }

    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2
    }).format(amount);
  }

  private createAssistantMessage(response: string): Message {
    const products: ProductCard[] = (response || '')
      .split(/\r?\n/)
      .map((line) => {
        const match = line.match(
          /^\s*-\s*(.*?)\s*\|\s*Price:\s*(.*?)\s*(?:\|\s*Category:\s*(.*))?$/i
        );

        if (!match) {
          return null;
        }

        return {
          name: match[1].trim(),
          price: match[2].trim(),
          category: match[3]?.trim() || undefined
        };
      })
      .filter((product): product is ProductCard => product !== null);

    if (products.length > 0) {
      return {
        role: 'assistant',
        text: 'Here are the products I found for you.',
        timestamp: new Date(),
        products
      };
    }

    return {
      role: 'assistant',
      text: response || 'I couldn’t find a response. Please try again.',
      timestamp: new Date()
    };
  }
}

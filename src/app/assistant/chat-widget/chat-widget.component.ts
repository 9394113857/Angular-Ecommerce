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
  relatedProducts?: ProductCard[];
  relatedExpanded?: boolean;
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
    const normalizedPrice = String(price).replace(/[^\d.-]/g, '');

    if (!normalizedPrice) {
      return price;
    }

    const amount = Number(normalizedPrice);

    if (!Number.isFinite(amount)) {
      return price;
    }

    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2
    }).format(amount);
  }
  private parseProducts(response: string): ProductCard[] {
    return (response || '')
      .split(/\r?\n/)
      .map((line): ProductCard | null => {
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
  }

  toggleRelatedProducts(message: Message): void {
    message.relatedExpanded = !message.relatedExpanded;
  }

  private createAssistantMessage(response: string): Message {
    const marker = '__RELATED_PRODUCTS__';
    const sections = (response || '').split(marker);
    const mainResponse = sections[0].trim();
    const relatedResponse = sections[1] || '';
    const products = this.parseProducts(mainResponse);
    const relatedProducts = this.parseProducts(relatedResponse);

    if (products.length > 0) {
      return {
        role: 'assistant',
        text: 'Here are the products I found for you.',
        timestamp: new Date(),
        products,
        relatedProducts,
        relatedExpanded: false
      };
    }

    return {
      role: 'assistant',
      text: mainResponse || 'I couldn’t find a response. Please try again.',
      timestamp: new Date()
    };
  }
}

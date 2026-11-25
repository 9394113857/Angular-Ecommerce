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
  copiedMessageIndex: number | null = null;
  chatCopied = false;

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

    this.assistantService.sendMessage(message).subscribe({
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

  async copyMessage(message: Message, index: number): Promise<void> {
    const markdown = this.messageToMarkdown(message);
    const copied = await this.writeToClipboard(markdown);

    if (copied) {
      this.copiedMessageIndex = index;
      window.setTimeout(() => {
        if (this.copiedMessageIndex === index) {
          this.copiedMessageIndex = null;
        }
      }, 1800);
    }
  }

  async copyConversation(): Promise<void> {
    if (!this.messages.length) {
      return;
    }

    const markdown = this.messages
      .map((message) => this.messageToMarkdown(message))
      .join("\n\n---\n\n");

    const copied = await this.writeToClipboard(markdown);
    if (copied) {
      this.chatCopied = true;
      window.setTimeout(() => (this.chatCopied = false), 1800);
    }
  }

  private messageToMarkdown(message: Message): string {
    const heading = message.role === 'user' ? 'You' : 'Shopping Assistant';
    const timestamp = message.timestamp instanceof Date
      ? message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    const lines = [`**${heading}**${timestamp ? ` · ${timestamp}` : ''}`];

    if (message.text) {
      lines.push(message.text.trim());
    }

    if (message.products?.length) {
      for (const product of message.products) {
        lines.push(
          `- **${product.name}** — ${this.formatPrice(product.price)}${product.category ? ` · ${product.category}` : ''}`
        );
      }
    }

    if (message.relatedProducts?.length) {
      lines.push('', '**Optional add-ons you may need**');
      for (const product of message.relatedProducts) {
        lines.push(
          `- **${product.name}** — ${this.formatPrice(product.price)}${product.category ? ` · ${product.category}` : ''}`
        );
      }
    }

    return lines.join("\n");
  }

  private async writeToClipboard(value: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }

      const textArea = document.createElement('textarea');
      textArea.value = value;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textArea);
      return copied;
    } catch {
      return false;
    }
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

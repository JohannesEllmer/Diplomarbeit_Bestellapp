import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-cart-item',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe], 
  styleUrls: ['./cart-item.css'],
  templateUrl: './cart-item.html',
  encapsulation: ViewEncapsulation.None 
})
export class CartItemComponent {
  @Input() item: any;
  @Output() remove = new EventEmitter<void>();
  @Output() increase = new EventEmitter<void>();
  @Output() decrease = new EventEmitter<void>();

  private apiBaseUrl = 'http://localhost:3000/api'; // Deine Backend-URL

  currentImageUrl: string = '';


}
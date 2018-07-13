import { Component, Input } from '@angular/core';

@Component({
  selector: 'cd-info-card',
  templateUrl: './info-card-pf.component.html',
  styleUrls: ['./info-card-pf.component.scss']
})
export class InfoCardComponent {
  @Input() title: string;
  @Input() link: string;
  @Input() rowClass = 'col-md-6';
  @Input() cardClass = '';
  @Input() imageClass: string;
  @Input() contentClass: string;
}

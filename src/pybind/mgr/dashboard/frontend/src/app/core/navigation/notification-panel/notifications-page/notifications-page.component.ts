import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificationService } from '~/app/shared/services/notification.service';
import { CdNotification } from '~/app/shared/models/cd-notification';
import { PrometheusAlertService } from '~/app/shared/services/prometheus-alert.service';
import { PrometheusNotificationService } from '~/app/shared/services/prometheus-notification.service';
import { AuthStorageService } from '~/app/shared/services/auth-storage.service';
import { IconSize } from '~/app/shared/enum/icons.enum';

const READ_STORAGE_KEY = 'cdNotificationsRead';

@Component({
  selector: 'cd-notifications-page',
  templateUrl: './notifications-page.component.html',
  styleUrls: ['./notifications-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class NotificationsPageComponent implements OnInit, OnDestroy {
  iconSize = IconSize;
  notifications: CdNotification[] = [];
  selectedNotificationID: string | null = null;
  readMap: Record<string, boolean> = {};
  private sub: Subscription;
  private interval: number;

  constructor(
    private notificationService: NotificationService,
    private prometheusAlertService: PrometheusAlertService,
    private prometheusNotificationService: PrometheusNotificationService,
    private authStorageService: AuthStorageService,
    private location: Location,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReadMap();

    const permissions = this.authStorageService.getPermissions();
    if (permissions.prometheus.read && permissions.configOpt.read) {
      this.triggerPrometheusAlerts();
      this.interval = window.setInterval(() => {
        this.triggerPrometheusAlerts();
      }, 5000);
    }

    this.sub = this.notificationService.data$.subscribe((notifications) => {
      this.notifications = notifications;
      this.updateBellUnreadState();
      this.cd.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (this.interval) {
      window.clearInterval(this.interval);
    }
  }

  goBack(): void {
    this.location.back();
  }

  clearAll(): void {
    this.notificationService.removeAll();
    this.selectedNotificationID = null;
  }

  onNotificationSelect(notification: CdNotification): void {
    this.selectedNotificationID = notification.id;
    this.markAsRead(notification);
  }

  get selectedNotification(): CdNotification | undefined {
    return this.notifications.find((n) => n.id === this.selectedNotificationID);
  }

  getPreviewText(notification: CdNotification): string {
    if (notification.prometheusAlert?.description) {
      return notification.prometheusAlert.description;
    }
    return notification.message || '';
  }

  getTitle(notification: CdNotification): string {
    if (notification.prometheusAlert?.alertName) {
      return notification.prometheusAlert.alertName;
    }
    return notification.title || '';
  }

  removeNotification(notification: CdNotification, event: MouseEvent): void {
    event.stopPropagation();
    const index = this.notifications.findIndex((n) => n.id === notification.id);
    if (index > -1) {
      this.notificationService.remove(index);
      if (this.selectedNotificationID === notification.id) {
        this.selectedNotificationID = null;
      }
    }
  }

  trackByNotificationId(_index: number, notification: CdNotification): string {
    return notification.id;
  }

  private markAsRead(notification: CdNotification): void {
    if (this.readMap[notification.id]) {
      return;
    }
    this.readMap = { ...this.readMap, [notification.id]: true };
    this.saveReadMap();
    this.updateBellUnreadState();
  }

  private updateBellUnreadState(): void {
    const hasUnread = this.notifications.some((n) => !this.readMap[n.id]);
    this.notificationService.setHasUnread(hasUnread);
  }

  private loadReadMap(): void {
    try {
      const stored = localStorage.getItem(READ_STORAGE_KEY);
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        this.readMap = {};
        for (const id of ids) {
          this.readMap[id] = true;
        }
      }
    } catch {
      this.readMap = {};
    }
  }

  private saveReadMap(): void {
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Object.keys(this.readMap)));
  }

  private triggerPrometheusAlerts(): void {
    this.prometheusAlertService.refresh();
    this.prometheusNotificationService.refresh();
  }
}

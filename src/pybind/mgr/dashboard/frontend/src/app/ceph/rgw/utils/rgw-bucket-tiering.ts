import {
  Target,
  TierTarget,
  TierType,
  ZoneGroup,
  ZoneGroupDetails
} from '../models/rgw-storage-class.model';

export class BucketTieringUtils {
  static filterAndMapTierTargets(zonegroupData: ZoneGroupDetails) {
    return zonegroupData.zonegroups.flatMap((zoneGroup: ZoneGroup) =>
      zoneGroup.placement_targets.flatMap((target: Target) => {
        const mappedKeys = new Set<string>(
          (target.tier_targets || []).map((tt: TierTarget) => tt.key)
        );

        const tierTargetDetails = (target.tier_targets || []).map((tierTarget: TierTarget) =>
          this.getTierTargets(tierTarget, zoneGroup.name, target.name)
        );

        const unmappedStorageClasses = (target.storage_classes || [])
          .filter((sc) => sc !== 'STANDARD' && !mappedKeys.has(sc))
          .map((sc) => ({
            zonegroup_name: zoneGroup.name,
            placement_target: target.name,
            storage_class: sc
          }));

        return [...tierTargetDetails, ...unmappedStorageClasses];
      })
    );
  }

  private static getTierTargets(tierTarget: TierTarget, zoneGroup: string, targetName: string) {
    const val = tierTarget.val;

    if (val.tier_type === TierType.GLACIER) {
      return {
        zonegroup_name: zoneGroup,
        placement_target: targetName,
        storage_class: val.storage_class,
        retain_head_object: val.retain_head_object,
        allow_read_through: val.allow_read_through,
        glacier_restore_days: val['s3-glacier']?.glacier_restore_days,
        glacier_restore_tier_type: val['s3-glacier']?.glacier_restore_tier_type,
        restore_storage_class: val.restore_storage_class,
        read_through_restore_days: val.read_through_restore_days,
        tier_type: val.tier_type,
        ...val.s3
      };
    } else if (val.tier_type === TierType.CLOUD_TIER) {
      return {
        zonegroup_name: zoneGroup,
        placement_target: targetName,
        storage_class: val.storage_class,
        retain_head_object: val.retain_head_object,
        allow_read_through: val.allow_read_through,
        tier_type: val.tier_type,
        ...val.s3
      };
    } else {
      return {
        zonegroup_name: zoneGroup,
        placement_target: targetName,
        storage_class: val.storage_class
      };
    }
  }
}

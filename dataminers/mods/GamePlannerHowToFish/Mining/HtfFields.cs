using System;
using System.Collections.Generic;
using HarmonyLib;
using UnityEngine;
using UnityEngine.Localization;

namespace GamePlanner.HowToFish.Mining
{
    /// <summary>
    /// Campo privado de um tipo do jogo, lido pelo FieldRef do Harmony (sem o custo de reflection a cada
    /// leitura). Se uma atualização do jogo renomear o campo, a leitura devolve o valor padrão e o nome vai
    /// para HtfFields.Missing, que vira aviso no dataset, em vez de derrubar a mineração.
    /// </summary>
    internal sealed class Field<T, F> where T : class
    {
        private readonly string _name;
        private AccessTools.FieldRef<T, F> _ref;
        private bool _resolved;

        public Field(string name) => _name = name;

        public F Get(T owner, F fallback = default)
        {
            if (owner == null) return fallback;
            if (!_resolved)
            {
                _resolved = true;
                try
                {
                    _ref = AccessTools.FieldRefAccess<T, F>(_name);
                }
                catch (Exception)
                {
                    HtfFields.Missing.Add(typeof(T).Name + "." + _name);
                }
            }
            return _ref != null ? _ref(owner) : fallback;
        }
    }

    /// <summary>Campos privados usados pelos mineradores. O jogo guarda quase tudo em [SerializeField] private.</summary>
    internal static class HtfFields
    {
        public static readonly HashSet<string> Missing = new HashSet<string>();

        public static readonly Field<Item, LocalizedString> ItemName = new Field<Item, LocalizedString>("_nameLocalized");
        public static readonly Field<Item, float> ItemWeight = new Field<Item, float>("_weight");
        public static readonly Field<Item, Mesh> ItemMesh = new Field<Item, Mesh>("_mesh");
        public static readonly Field<Item, List<Renderer>> ItemRenderers = new Field<Item, List<Renderer>>("_renderers");

        public static readonly Field<Creature, int> CreatureMaxHp = new Field<Creature, int>("_maxHp");
        public static readonly Field<Creature, Mesh> CreatureDripMesh = new Field<Creature, Mesh>("_dripMesh");

        public static readonly Field<Weapon, WeaponInfo> WeaponInfo = new Field<Weapon, WeaponInfo>("_weaponInfo");
        public static readonly Field<Weapon, bool> WeaponFullAuto = new Field<Weapon, bool>("_fullAuto");
        public static readonly Field<Weapon, bool> WeaponCanAds = new Field<Weapon, bool>("_canAds");
        public static readonly Field<Weapon, float> WeaponTimeBetweenShots = new Field<Weapon, float>("_timeBetweenShots");
        public static readonly Field<Weapon, float> WeaponSpread = new Field<Weapon, float>("_spread");
        public static readonly Field<Weapon, int> WeaponProjectilesPerShot = new Field<Weapon, int>("_projectileCountPerShot");

        public static readonly Field<Attachments, List<Sight>> Sights = new Field<Attachments, List<Sight>>("_sights");
        public static readonly Field<Attachments, List<BarrelAttachment>> Barrels = new Field<Attachments, List<BarrelAttachment>>("_barrelAttachments");
        public static readonly Field<Attachments, BulletUpgrade[]> BulletUpgrades = new Field<Attachments, BulletUpgrade[]>("_bulletUpgrades");
        public static readonly Field<Attachments, int> DefaultAmmoPerMag = new Field<Attachments, int>("_defaultAmmoPerMag");
        public static readonly Field<Attachments, int> ExtendedAmmoPerMag = new Field<Attachments, int>("_extendedAmmoPerMag");
        public static readonly Field<Attachments, LaserSight> LaserSight = new Field<Attachments, LaserSight>("_laserSight");
        public static readonly Field<Attachments, AttachmentInfo> ExtendedMagInfo = new Field<Attachments, AttachmentInfo>("_extendedMagInfo");
        public static readonly Field<Attachments, int> ExtendedMagCost = new Field<Attachments, int>("_extendedMagCost");

        public static readonly Field<AttachmentInfo, LocalizedString> AttachmentName = new Field<AttachmentInfo, LocalizedString>("_nameLocalized");
        public static readonly Field<AttachmentInfo, LocalizedString> AttachmentDescription = new Field<AttachmentInfo, LocalizedString>("_descriptionLocalized");
        public static readonly Field<AttachmentInfo, string> AttachmentRawName = new Field<AttachmentInfo, string>("_name");

        public static readonly Field<BaitInfo, LocalizedString> BaitName = new Field<BaitInfo, LocalizedString>("_nameLocalized");
        public static readonly Field<BaitInfo, LocalizedString> BaitDescription = new Field<BaitInfo, LocalizedString>("_descriptionLocalized");
        public static readonly Field<BaitInfo, string> BaitRawName = new Field<BaitInfo, string>("_name");

        public static readonly Field<Melee, SharpnessUpgrade[]> SharpnessUpgrades = new Field<Melee, SharpnessUpgrade[]>("_sharpnessUpgrades");
        public static readonly Field<Melee, float> MeleeRange = new Field<Melee, float>("_range");

        public static readonly Field<FishingRod, float> RodMinLine = new Field<FishingRod, float>("_minLineLength");
        public static readonly Field<FishingRod, float> RodMaxLine = new Field<FishingRod, float>("_maxLineLength");

        public static readonly Field<Explosive, ExplosionInfo> Explosion = new Field<Explosive, ExplosionInfo>("_explosionInfo");

        public static readonly Field<PlayerInventory, int[]> ExtraSlotCosts = new Field<PlayerInventory, int[]>("_extraSlotCosts");
        public static readonly Field<PlayerInventory, int> StartingSlots = new Field<PlayerInventory, int>("_startingSlots");
        public static readonly Field<PlayerInventory, List<InventorySlot>> ItemSlots = new Field<PlayerInventory, List<InventorySlot>>("_itemSlots");
        public static readonly Field<InventorySlot, MeshFilter> SlotFilter = new Field<InventorySlot, MeshFilter>("_filter");

        public static readonly Field<Boat, List<BoatMotor>> BoatMotors = new Field<Boat, List<BoatMotor>>("_motors");

        public static readonly Field<Purchasable, bool> PurchasableFree = new Field<Purchasable, bool>("_isFree");
        public static readonly Field<Purchasable, int> PurchasableCost = new Field<Purchasable, int>("_customCost");
        public static readonly Field<MotorPurchasable, LocalizedString> MotorName = new Field<MotorPurchasable, LocalizedString>("_motorNameLocalized");
        public static readonly Field<MotorPurchasable, byte> MotorIndex = new Field<MotorPurchasable, byte>("_motorIndex");
        public static readonly Field<BoatRadarPurchasable, LocalizedString> RadarName = new Field<BoatRadarPurchasable, LocalizedString>("_radarNameLocalized");

        public static readonly Field<SkinManager, Clothes[]> AllClothes = new Field<SkinManager, Clothes[]>("_allClothes");
        public static readonly Field<NPC, List<NPCQuest>> NpcQuests = new Field<NPC, List<NPCQuest>>("_quests");

        /// <summary>Campo de instância pelo nome, para os que só se conhecem em tempo de execução (roupas do SkinManager).</summary>
        public static F Named<F>(object owner, string name) where F : class
        {
            if (owner == null) return null;
            try
            {
                return AccessTools.Field(owner.GetType(), name)?.GetValue(owner) as F;
            }
            catch (Exception)
            {
                Missing.Add(owner.GetType().Name + "." + name);
                return null;
            }
        }
    }
}

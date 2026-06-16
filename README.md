# Coach Muscu

Application **desktop locale pour macOS** qui agit comme un coach de musculation personnel :
création de programmes sur **12 semaines**, adaptation automatique aux **douleurs et limitations**,
**suivi des séances**, **statistiques** et **export PDF**. Toutes les données restent **sur ton Mac** —
aucun compte, aucun serveur, aucune synchro distante.

> ⚠️ Les adaptations proposées sont automatiques et indicatives. Elles ne constituent pas un
> diagnostic ni un avis médical et ne remplacent pas l'avis d'un médecin ou d'un kinésithérapeute.
> L'application n'encourage jamais à forcer à travers une douleur aiguë.

## Stack technique

| Couche | Choix |
| --- | --- |
| Desktop | Electron 33 (context isolation, sandbox preload, IPC typé) |
| UI | React 18 + TypeScript + Vite (electron-vite) |
| Style | Tailwind CSS (thèmes clair/sombre) |
| État | Zustand |
| Base de données | SQLite locale via better-sqlite3 (migrations versionnées) |
| Graphiques | Recharts |
| PDF | pdfmake |
| Tests | Vitest |

### Architecture

Le **cœur métier** (`src/shared/domain`) est du TypeScript pur, sans dépendance Electron/React,
donc entièrement testable :

```
src/
  shared/                 ← code partagé main + renderer
    types/                modèles de données (profil, exercice, programme, douleur, séance)
    domain/
      generator/          génération du programme (split, volume, périodisation, sélection)
      pain/               règles d'adaptation aux douleurs + remplacement d'exercices
      load/               recommandation de charge (double progression, 1RM)
      readiness.ts        « feu de séance » à partir de l'état du jour
    ipc/contract.ts       contrat IPC typé (window.api)
  main/                   processus Electron : DB, migrations, seed, handlers IPC, sauvegardes
  preload/                pont sécurisé contextBridge
  renderer/               application React (pages, composants, store)
tests/                    tests du moteur (générateur, douleurs, progression)
```

## Démarrer en développement

```bash
npm install            # dépendances
npm run rebuild        # compile better-sqlite3 pour l'ABI d'Electron (une fois)
npm run dev            # lance l'app en mode développement (hot reload)
```

## Vérifier le projet

```bash
npm run typecheck      # TypeScript (main + renderer)
npm test               # tests unitaires du moteur (Vitest)
npm run lint           # ESLint
npm run format         # Prettier
```

## Compiler et générer le .dmg (macOS)

```bash
npm run build          # typecheck + bundles de production
npm run build:dmg      # génère release/Coach Muscu-<version>-<arch>.dmg
```

Le `.dmg` est produit pour **Apple Silicon (arm64)** et **Intel (x64)** (voir `electron-builder.yml`).
L'app n'est pas signée par défaut (usage personnel) : au premier lancement, fais
clic droit → *Ouvrir* pour passer la vérification Gatekeeper.

## Où sont mes données ?

Tout est stocké localement dans le dossier *userData* de l'app :

```
~/Library/Application Support/Coach Muscu/
  coach-muscu.sqlite     base de données
  backups/               sauvegardes automatiques
```

- **Exporter / importer** une sauvegarde JSON : page *Paramètres*.
- **Réinitialiser** les données personnelles (le catalogue d'exercices est conservé) : page *Paramètres*.

## Ajouter des exercices

Le catalogue initial est défini dans [`src/main/db/seed/exercises.seed.ts`](src/main/db/seed/exercises.seed.ts).
Chaque exercice utilise le helper `mk({...})` ; seuls les axes de risque non nuls sont à renseigner :

```ts
mk({
  id: 'pec-pompes',
  nameFr: 'Pompes',
  nameEn: 'Push-up',
  category: 'pectoraux',
  primaryMuscle: 'pectoraux',
  secondaryMuscles: ['triceps', 'epaules'],
  equipment: ['poids-corps'],
  difficulty: 1,
  risk: { epaule: 1 },                // 0–3 ; le reste vaut 0 automatiquement
  alternativeIds: ['pec-presse-pectoraux'],
})
```

Le **profil de risque** (`cervical`, `lombaire`, `coude`, `biceps`, `epaule`, `poignet`, `genou`,
`hanche`, `fatigueSystemique`, notés 0–3) est ce qui pilote l'adaptation aux douleurs : un exercice
dont le risque sur une zone douloureuse dépasse le seuil est automatiquement remplacé ou retiré.

On peut aussi ajouter/modifier des exercices depuis l'app (à venir dans la page *Bibliothèque*).

## Ajouter des images

Chaque exercice porte des champs `machineImage` / `movementImage` de type `ImageSource`
(`url`, `localPath`, `author`, `license`, `source`) et un `videoUrl` (lien YouTube ouvert dans le
navigateur, jamais téléchargé). Privilégier des illustrations créées localement ou des sources
libres (Wikimedia Commons) en conservant l'auteur et la licence. Aucune API payante n'est utilisée.

## Logique sportive (résumé)

- **Génération** : split choisi selon fréquence/niveau → budget de volume hebdomadaire par muscle
  (modulé par les priorités) → sélection d'exercices scorés (polyarticulaire d'abord, équipement
  dispo, compatibilité douleur, exos appréciés/évités) → schéma reps/RPE/RIR/repos selon l'objectif.
- **Périodisation 12 semaines** : prise en main (1‑3), délestages (S4, S8), progression (5‑7),
  consolidation (9‑11), bilan (S12), via des multiplicateurs de volume/intensité.
- **Adaptation douleurs** : seuils de risque par zone calculés depuis l'intensité (et plus prudents
  pour les discopathies / douleurs au repos) ; chaque modification est **justifiée** ; drapeaux
  rouges (irradiation, fourmillements, faiblesse, douleur aiguë) → recommandation d'arrêt + avis pro.
- **Charges** : double progression (progresser dans la fourchette de reps, puis +1 pas de charge),
  pas réglable, recommandations expliquées, jamais de progression sous douleur.

## État d'avancement

✅ **Les 14 pages sont fonctionnelles** : Tableau de bord · Mon profil · Créer un programme ·
Programme actuel · Calendrier 12 semaines · Séance du jour (état du jour + feu de séance, chrono de
repos avec décompte sonore, saisie par série, boutons douleur/remplacer/machine indispo, alternatives)
· Bibliothèque · Historique · Progression (graphiques Recharts) · Douleurs & récupération · Mesures ·
Exports PDF (4 formats) · Sauvegardes/Paramètres.

✅ Socle Electron/React/TS + SQLite · moteur de génération · adaptation douleurs · double progression ·
analytics · 4 exports PDF · sauvegarde locale · données de démo · 21 tests.

🚧 Reste à venir : **photos de progression** (import local), et l'enrichissement du catalogue
d'exercices (~40 actuellement → cible 100+).

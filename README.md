# Music Room

## Backend

Copier la configuration locale :

```bash
cp .env.example .env
```

Lancer le backend complet depuis la racine :

```bash
make backend setup
```

Cette commande installe les dépendances, synchronise la configuration locale, démarre Supabase, puis lance l'API Fastify dans le même terminal.

Relancer sans refaire le setup :

```bash
make backend start
```

Arrêter le backend complet :

```bash
make backend stop
```

Réinitialiser Supabase et relancer l'API :

```bash
make backend reset
```

Supprimer les dépendances/builds backend et les assets Docker Supabase :

```bash
make fclean
```

Commandes manuelles équivalentes :

```bash
cd backend
pnpm install
pnpm db:start
pnpm dev
```

Vérifier l'API :

```bash
curl http://localhost:3000/health
```

Réponse attendue :

```json
{
  "status": "ok"
}
```

Les ports modifiables sont déclarés dans `.env` à la racine du dépôt. La commande `pnpm db:start` les recopie dans la configuration Supabase et Bruno, car ces outils lisent leurs propres fichiers.

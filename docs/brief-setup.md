# Brief setup — Subir repo a GitHub

Este archivo explica cómo inicializar Git localmente y subir el proyecto al repositorio remoto: https://github.com/DanielLC24/Cl-nica-Odontolog-a.git

1) Configurar usuario (si no está configurado):

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@correo.com"
```

2) Inicializar y preparar commit:

```bash
cd "c:/Users/danie/Documents/Codex/2026-09-06/qu/ProyectoMoviles"
git init
git add .
git commit -m "chore: initial project import"
git branch -M main
```

3) Añadir remoto y push (HTTPS):

```bash
git remote add origin https://github.com/DanielLC24/Cl-nica-Odontolog-a.git
git push -u origin main
```

- Si GitHub solicita usuario/contraseña, usa tu usuario y un Personal Access Token (PAT) como contraseña.
- Para evitar ingresar PAT manualmente, puedes usar `gh auth login` (GitHub CLI) y luego usar `gh repo create` o `git push`.

4) Alternativa con GitHub CLI (si `gh` está instalado):

```bash
gh auth login
gh repo create DanielLC24/Cl-nica-Odontolog-a --public --source=. --remote=origin --push
```

5) Alternativa con SSH (si ya configuraste clave SSH en GitHub):

```bash
git remote add origin git@github.com:DanielLC24/Cl-nica-Odontolog-a.git
git push -u origin main
```

Notas y recomendaciones:
- NO subas archivos sensibles (`.env`, datos de DB, volúmenes). `.gitignore` ya excluye `node_modules`, `.env` y volúmenes.
- Revisa `README.md` y `docs/etapa-1-planeacion.md` antes del primer push.
- Si quieres que yo genere un `CHANGELOG.md` o un `LICENSE`, dímelo y lo creo aquí.

Limitación importante:
- No puedo ejecutar `git push` en tu máquina ni autenticar por ti. Debes ejecutar los comandos anteriores localmente.

***
Archivo creado para facilitar el primer commit y push al repositorio remoto.

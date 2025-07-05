console.log("Script chargé et exécuté");

const fs = require("fs");
const path = require("path");
const { shell } = require("electron");
const PDFDocument = require("pdfkit");

// Chemins fichiers
const cheminFichierEmployes = path.join(__dirname, "data", "employes.json");
const cheminFichierPDF = path.join(__dirname, "exports", "rapport.pdf");

// === INIT ===
window.addEventListener("DOMContentLoaded", () => {
  // Remplir la date du jour au format YYYY-MM-DD
  const champDate = document.getElementById("date");
  const today = new Date();
  champDate.value = today.toISOString().slice(0, 10);

  // Charger les employés sauvegardés
  chargerEmployes();

  // Générer options heures
  genererOptionsHeures("heureDebut");
  genererOptionsHeures("heureFin");
});

// === GESTION POINTAGE ===
document.getElementById("form-pointage").addEventListener("submit", (e) => {
  e.preventDefault();

  const employe = document.getElementById("employe").value;
  const date = document.getElementById("date").value;
  const heureDebut = document.getElementById("heureDebut").value;
  const heureFin = document.getElementById("heureFin").value;

  if (!employe) return alert("Sélectionne un employé.");
  if (!date || !heureDebut || !heureFin) return alert("Complète tous les champs.");

  const duree = calculerHeures(heureDebut, heureFin);

  ajouterLigne(employe, date, heureDebut, heureFin, duree);

  // Ne plus générer le PDF ici à chaque ajout
});

// === AJOUT EMPLOYE ===
document.getElementById("ajouterEmploye").addEventListener("click", () => {
  const inputNom = document.getElementById("nouvelEmploye");
  const selectRole = document.getElementById("roleEmploye");
  const nom = inputNom.value.trim();
  const role = selectRole.value;

  if (!nom || !role) return alert("Merci de saisir un nom et un rôle.");

  const select = document.getElementById("employe");
  const existe = Array.from(select.options).some(
    (opt) => opt.value.toLowerCase() === nom.toLowerCase()
  );
  if (existe) {
    alert("Cet employé existe déjà !");
    inputNom.value = "";
    selectRole.value = "";
    return;
  }

  const option = document.createElement("option");
  option.value = nom;
  option.textContent = `${nom} (${role})`;
  option.setAttribute("data-role", role);
  select.appendChild(option);

  sauvegarderEmploye(nom, role);

  inputNom.value = "";
  selectRole.value = "";
});

// === SUPPRESSION EMPLOYE ===
document.getElementById("supprimerEmploye").addEventListener("click", () => {
  const select = document.getElementById("employe");
  const nom = select.value;
  if (!nom) return alert("Sélectionne un employé à supprimer.");

  if (!confirm(`Supprimer ${nom} ?`)) return;

  select.querySelector(`option[value="${nom}"]`)?.remove();

  if (fs.existsSync(cheminFichierEmployes)) {
    const data = fs.readFileSync(cheminFichierEmployes, "utf-8");
    try {
      let liste = JSON.parse(data);
      liste = liste.filter((e) => e.nom.toLowerCase() !== nom.toLowerCase());
      fs.writeFileSync(cheminFichierEmployes, JSON.stringify(liste, null, 2), "utf-8");
      console.log(`Employé ${nom} supprimé.`);
    } catch (err) {
      console.error("Erreur suppression employé :", err);
    }
  }
});

// === CALCUL DES HEURES (retourne objet {heures, minutes}) ===
function calculerHeures(debut, fin) {
  const debutDate = new Date(`1970-01-01T${debut}:00`);
  let finDate = new Date(`1970-01-01T${fin}:00`);
  if (finDate <= debutDate) finDate.setDate(finDate.getDate() + 1);
  const diffMs = finDate - debutDate;

  const totalMinutes = diffMs / (1000 * 60);
  const heures = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  return { heures, minutes };
}

// === FORMAT HEURES MINUTES ===
function formatHeuresMinutes({ heures, minutes }) {
  return `${heures}H${minutes.toString().padStart(2, "0")}`;
}

// === FORMAT DATE FRANÇAISE (ex: 12 janvier 2025) ===
function formatDateFR(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// === FORMAT HEURE AFFICHAGE (ex: 3H45) ===
function formatHeure(hm) {
  const [h, m] = hm.split(":");
  return `${parseInt(h)}H${m}`;
}

// === AJOUT LIGNE TABLEAU ===
function ajouterLigne(employe, dateStr, debut, fin, duree) {
  const tbody = document.querySelector("#tableau-heures tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${employe}</td>
    <td>${formatDateFR(dateStr)}</td>
    <td>${formatHeure(debut)}</td>
    <td>${formatHeure(fin)}</td>
    <td>${formatHeuresMinutes(duree)}</td>
  `;
  tbody.appendChild(tr);
}

// === SAUVEGARDE EMPLOYE ===
function sauvegarderEmploye(nom, role) {
  let liste = [];
  if (fs.existsSync(cheminFichierEmployes)) {
    const data = fs.readFileSync(cheminFichierEmployes, "utf-8");
    try {
      liste = JSON.parse(data);
    } catch (err) {
      console.error("Erreur lecture JSON :", err);
    }
  }

  const existe = liste.some((e) => e.nom.toLowerCase() === nom.toLowerCase());
  if (existe) return;

  liste.push({ nom, role });
  fs.writeFileSync(cheminFichierEmployes, JSON.stringify(liste, null, 2), "utf-8");
  console.log(`Employé ${nom} ajouté.`);
}

// === CHARGEMENT DES EMPLOYES ===
function chargerEmployes() {
  if (!fs.existsSync(cheminFichierEmployes)) {
    console.warn("Fichier employes.json introuvable.");
    return;
  }

  const data = fs.readFileSync(cheminFichierEmployes, "utf-8");
  try {
    const liste = JSON.parse(data);
    const select = document.getElementById("employe");
    liste.forEach((e) => {
      const option = document.createElement("option");
      option.value = e.nom;
      option.textContent = `${e.nom} (${e.role})`;
      option.setAttribute("data-role", e.role);
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Erreur JSON au chargement :", err);
  }
}

// === OPTIONS HORAIRES ===
function genererOptionsHeures(idSelect) {
  const select = document.getElementById(idSelect);
  if (!select) {
    console.warn(`Select introuvable : ${idSelect}`);
    return;
  }

  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      const opt = document.createElement("option");
      opt.value = `${hh}:${mm}`;
      opt.textContent = `${hh}:${mm}`;
      select.appendChild(opt);
    }
  }
}

// === BOUTON TÉLÉCHARGER PDF GLOBAL ===
document.getElementById("telechargerPDF").addEventListener("click", () => {
  genererPDFGlobal();
});

function genererPDFGlobal() {
  const doc = new PDFDocument({ margin: 30, size: "A4" });
  const stream = fs.createWriteStream(cheminFichierPDF);
  doc.pipe(stream);

  doc.fontSize(20).text("Rapport global des heures", { align: "center" });
  doc.moveDown();

  const lignes = document.querySelectorAll("#tableau-heures tbody tr");
  if (lignes.length === 0) {
    alert("Aucune donnée à exporter !");
    doc.end();
    return;
  }

  const tableTop = doc.y;
  const marginLeft = doc.page.margins.left;
  const rowHeight = 20;

  // Entêtes colonnes
  doc.fontSize(12).text("Employé", marginLeft, tableTop);
  doc.text("Date", marginLeft + 150, tableTop);
  doc.text("Début", marginLeft + 270, tableTop);
  doc.text("Fin", marginLeft + 350, tableTop);
  doc.text("Total (h)", marginLeft + 420, tableTop);

  let y = tableTop + rowHeight;

  lignes.forEach((tr) => {
    const tds = tr.querySelectorAll("td");
    doc.text(tds[0].textContent, marginLeft, y);
    doc.text(tds[1].textContent, marginLeft + 150, y);
    doc.text(tds[2].textContent, marginLeft + 270, y);
    doc.text(tds[3].textContent, marginLeft + 350, y);
    doc.text(tds[4].textContent, marginLeft + 420, y);

    y += rowHeight;
    if (y > doc.page.height - 50) {
      doc.addPage();
      y = doc.page.margins.top;
    }
  });

  doc.end();

  stream.on("finish", () => {
    alert("PDF global généré dans le dossier exports.");
    shell.openPath(cheminFichierPDF);
  });
}

let produits = [];


// ============================================================
// CHARGER PRODUITS
// ============================================================

async function chargerProduits() {
    try {
        const reponse = await fetch("/api/products", {
            cache: "no-store"
        });

        if (!reponse.ok) {
            throw new Error("Impossible de charger les produits.");
        }

        const resultat = await reponse.json();

        produits = Array.isArray(resultat) ? resultat : [];

        produits = produits.map(produit => ({
            id: produit.id || creerIdProduit(),
            nom: produit.nom || "Nouveau produit",
            prix: Number(produit.prix || 0),
            stock: Number(produit.stock || 0),
            images: Array.isArray(produit.images)
                ? produit.images
                : []
        }));

        afficherProduits();

    } catch (erreur) {
        console.error("❌ Chargement produits :", erreur);

        const liste = document.getElementById("liste-produits");

        if (liste) {
            liste.innerHTML = `
                <div class="info-admin">
                    ❌ ${echapperAdmin(erreur.message)}
                </div>
            `;
        }
    }
}


// ============================================================
// AFFICHER PRODUITS
// ============================================================

function afficherProduits() {
    const liste = document.getElementById("liste-produits");

    if (!liste) {
        return;
    }

    if (produits.length === 0) {
        liste.innerHTML = `
            <div class="info-admin">
                Aucun produit pour le moment.
            </div>
        `;
        return;
    }

    liste.innerHTML = produits
        .map((produit, index) => creerProduitHTML(produit, index))
        .join("");
}


// ============================================================
// HTML PRODUIT
// ============================================================

function creerProduitHTML(produit, index) {

    const images = Array.isArray(produit.images)
        ? produit.images
        : [];

    const photosHTML = images.length > 0

        ? images
            .map((image, photoIndex) => `
                <div class="admin-photo">

                    <img
                        src="${image}"
                        alt="${echapperAdmin(produit.nom)}"
                    >

                    <button
                        type="button"
                        title="Supprimer"
                        onclick="supprimerPhoto(${index}, ${photoIndex})"
                    >
                        ×
                    </button>

                </div>
            `)
            .join("")

        : `
            <div class="info-admin">
                Aucune photo.
            </div>
        `;

    return `
        <div class="admin-produit">

            <h2>
                ${echapperAdmin(produit.nom)}
            </h2>

            <div class="admin-photos">
                ${photosHTML}
            </div>

            <div class="produit-champs">

                <div>
                    <label>Nom</label>

                    <input
                        type="text"
                        value="${attributHTML(produit.nom)}"
                        onchange="modifierProduit(
                            ${index},
                            'nom',
                            this.value
                        )"
                    >
                </div>

                <div>
                    <label>Prix (€)</label>

                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value="${Number(produit.prix || 0)}"
                        onchange="modifierProduit(
                            ${index},
                            'prix',
                            this.value
                        )"
                    >
                </div>

                <div>
                    <label>Stock</label>

                    <input
                        type="number"
                        min="0"
                        step="1"
                        value="${Number(produit.stock || 0)}"
                        onchange="modifierProduit(
                            ${index},
                            'stock',
                            this.value
                        )"
                    >
                </div>

            </div>

            <div class="produit-actions">

                <button
                    type="button"
                    onclick="ajouterPhotos(${index})"
                >
                    📷 Ajouter des photos
                </button>

                <button
                    type="button"
                    class="bouton-danger"
                    onclick="supprimerProduit(${index})"
                >
                    🗑️ Supprimer
                </button>

            </div>

        </div>
    `;
}


// ============================================================
// MODIFIER PRODUIT
// ============================================================

function modifierProduit(index, champ, valeur) {

    if (!produits[index]) {
        return;
    }

    if (champ === "nom") {
        produits[index].nom =
            String(valeur).trim() || "Produit sans nom";
    }

    if (champ === "prix") {
        produits[index].prix =
            Number(valeur) || 0;
    }

    if (champ === "stock") {
        produits[index].stock =
            Number(valeur);

        console.log(
            "Stock modifié :",
            produits[index].stock
        );
    }
}


// ============================================================
// AJOUTER PHOTOS
// ============================================================

function ajouterPhotos(index) {

    if (!produits[index]) {
        return;
    }

    const input = document.createElement("input");

    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.style.display = "none";

    document.body.appendChild(input);

    input.onchange = async () => {

        const fichiers =
            Array.from(input.files || []);

        if (!Array.isArray(produits[index].images)) {
            produits[index].images = [];
        }

        for (const fichier of fichiers) {

            try {

                const image =
                    await lireFichier(fichier);

                produits[index].images.push(image);

            } catch (erreur) {

                console.error(erreur);

            }
        }

        input.remove();

        afficherProduits();
    };

    input.click();
}


// ============================================================
// LIRE IMAGE
// ============================================================

function lireFichier(fichier) {

    return new Promise((resolve, reject) => {

        const lecteur = new FileReader();

        lecteur.onload = () => {
            resolve(lecteur.result);
        };

        lecteur.onerror = () => {
            reject(
                new Error("Impossible de lire l'image.")
            );
        };

        lecteur.readAsDataURL(fichier);
    });
}


// ============================================================
// SUPPRIMER PHOTO
// ============================================================

function supprimerPhoto(
    produitIndex,
    photoIndex
) {

    if (
        !produits[produitIndex] ||
        !Array.isArray(produits[produitIndex].images)
    ) {
        return;
    }

    produits[produitIndex].images.splice(
        photoIndex,
        1
    );

    afficherProduits();
}


// ============================================================
// AJOUTER PRODUIT
// ============================================================

function ajouterProduit() {

    produits.push({

        id: creerIdProduit(),

        nom: "Nouveau produit",

        prix: 0,

        stock: 0,

        images: []

    });

    afficherProduits();

    window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth"
    });
}


// ============================================================
// SUPPRIMER PRODUIT
// ============================================================

function supprimerProduit(index) {

    if (!produits[index]) {
        return;
    }

    if (
        !confirm(
            `Supprimer "${produits[index].nom}" ?`
        )
    ) {
        return;
    }

    produits.splice(index, 1);

    afficherProduits();
}


// ============================================================
// SAUVEGARDER PRODUITS
// ============================================================

async function sauvegarderProduits() {

    // Message immédiat
    afficherMessageAdmin(
        "⏳ Enregistrement en cours..."
    );

    try {

        console.log(
            "💾 Sauvegarde des produits...",
            produits
        );

        const reponse = await fetch(
            "/api/admin/sync-products",
            {
                method: "POST",

                credentials: "same-origin",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    produits: produits
                })
            }
        );

        const resultat =
            await reponse.json();

        if (!reponse.ok) {

            throw new Error(
                resultat.erreur ||
                "Impossible d'enregistrer les produits."
            );
        }

        console.log(
            "✅ Produits sauvegardés."
        );

        afficherMessageAdmin(
            "✅ Produits enregistrés."
        );

    } catch (erreur) {

        console.error(
            "❌ Erreur sauvegarde produits :",
            erreur
        );

        afficherMessageAdmin(
            "❌ " + erreur.message,
            true
        );
    }
}


// ============================================================
// CHARGER ADMINISTRATION DU SITE
// ============================================================

async function chargerPersonnalisation() {

    try {

        const reponse = await fetch(
            "/api/admin/settings",
            {
                credentials: "same-origin",
                cache: "no-store"
            }
        );

        const resultat =
            await reponse.json();

        if (!reponse.ok) {

            throw new Error(
                resultat.erreur ||
                "Impossible de charger les réglages."
            );
        }

        const nom =
            document.getElementById("nom-site");

        const titre =
            document.getElementById("titre-accueil");

        const texte =
            document.getElementById("texte-accueil");

        if (nom) {
            nom.value =
                resultat.nomSite ||
                "Origami Bijoux";
        }

        if (titre) {
            titre.value =
                resultat.titreAccueil ||
                "";
        }

        if (texte) {
            texte.value =
                resultat.texteAccueil ||
                "";
        }

    } catch (erreur) {

        console.error(
            "❌ Chargement personnalisation :",
            erreur
        );

        afficherMessageAdmin(
            "❌ Impossible de charger les réglages.",
            true
        );
    }
}


// ============================================================
// SAUVEGARDER ADMINISTRATION DU SITE
// ============================================================

async function sauvegarderPersonnalisation() {

    const nom =
        document.getElementById("nom-site")?.value.trim() ||
        "Origami Bijoux";

    const titre =
        document.getElementById("titre-accueil")?.value.trim() ||
        "";

    const texte =
        document.getElementById("texte-accueil")?.value.trim() ||
        "";

    try {

        const lecture = await fetch(
            "/api/admin/settings",
            {
                credentials: "same-origin",
                cache: "no-store"
            }
        );

        const anciens =
            lecture.ok
                ? await lecture.json()
                : {};

        const reponse = await fetch(
            "/api/admin/settings",
            {
                method: "POST",

                credentials: "same-origin",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    nomSite: nom,

                    titreAccueil: titre,

                    texteAccueil: texte,

                    prixPointRelais:
                        Number(
                            anciens.prixPointRelais ?? 3
                        ),

                    prixDomicile:
                        Number(
                            anciens.prixDomicile ?? 5
                        )
                })
            }
        );

        const resultat =
            await reponse.json();

        if (!reponse.ok) {

            throw new Error(
                resultat.erreur ||
                "Impossible d'enregistrer les réglages."
            );
        }

        afficherMessageAdmin(
            "✅ Administration du site enregistrée."
        );

    } catch (erreur) {

        console.error(
            "❌ Sauvegarde réglages :",
            erreur
        );

        afficherMessageAdmin(
            "❌ " + erreur.message,
            true
        );
    }
}


// ============================================================
// CHARGER LIVRAISON
// ============================================================

async function chargerReglagesLivraison() {

    try {

        const reponse = await fetch(
            "/api/admin/settings",
            {
                credentials: "same-origin",
                cache: "no-store"
            }
        );

        if (!reponse.ok) {
            return;
        }

        const reglages =
            await reponse.json();

        const relais =
            document.getElementById(
                "prix-point-relais"
            );

        const domicile =
            document.getElementById(
                "prix-domicile"
            );

        if (relais) {

            relais.value =
                Number(
                    reglages.prixPointRelais ?? 3
                );
        }

        if (domicile) {

            domicile.value =
                Number(
                    reglages.prixDomicile ?? 5
                );
        }

    } catch (erreur) {

        console.error(erreur);
    }
}


// ============================================================
// SAUVEGARDER LIVRAISON
// ============================================================

async function sauvegarderLivraison() {

    try {

        const lecture = await fetch(
            "/api/admin/settings",
            {
                credentials: "same-origin",
                cache: "no-store"
            }
        );

        const anciens =
            lecture.ok
                ? await lecture.json()
                : {};

        const relais =
            Number(
                document.getElementById(
                    "prix-point-relais"
                )?.value || 0
            );

        const domicile =
            Number(
                document.getElementById(
                    "prix-domicile"
                )?.value || 0
            );

        const reponse = await fetch(
            "/api/admin/settings",
            {
                method: "POST",

                credentials: "same-origin",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    nomSite:
                        anciens.nomSite ||
                        "Origami Bijoux",

                    titreAccueil:
                        anciens.titreAccueil ||
                        "",

                    texteAccueil:
                        anciens.texteAccueil ||
                        "",

                    prixPointRelais:
                        relais,

                    prixDomicile:
                        domicile
                })
            }
        );

        const resultat =
            await reponse.json();

        if (!reponse.ok) {

            throw new Error(
                resultat.erreur ||
                "Impossible d'enregistrer les tarifs."
            );
        }

        afficherMessageAdmin(
            "✅ Tarifs de livraison enregistrés."
        );

    } catch (erreur) {

        afficherMessageAdmin(
            "❌ " + erreur.message,
            true
        );
    }
}


// ============================================================
// MESSAGE ADMIN
// ============================================================

function afficherMessageAdmin(
    message,
    erreur = false
) {

    let element =
        document.getElementById(
            "message-admin"
        );

    if (!element) {

        element =
            document.createElement(
                "div"
            );

        element.id =
            "message-admin";

        element.style.position =
            "fixed";

        element.style.right =
            "20px";

        element.style.bottom =
            "20px";

        element.style.zIndex =
            "9999";

        element.style.padding =
            "14px 18px";

        element.style.borderRadius =
            "12px";

        element.style.fontWeight =
            "600";

        document.body.appendChild(
            element
        );
    }

    element.textContent =
        message;

    element.style.background =
        erreur
            ? "#fff1f1"
            : "#f1f8f1";

    element.style.color =
        erreur
            ? "#9c1c1c"
            : "#245b24";

    element.style.border =
        erreur
            ? "1px solid #f0c8c8"
            : "1px solid #cde2cd";

    element.style.display =
        "block";

    clearTimeout(
        element._timer
    );

    element._timer =
        setTimeout(
            () => {

                element.style.display =
                    "none";

            },
            4000
        );
}


// ============================================================
// OUTILS
// ============================================================

function creerIdProduit() {

    return (
        "prod_" +
        Date.now().toString(36) +
        "_" +
        Math.random()
            .toString(36)
            .slice(2, 8)
    );
}


function echapperAdmin(texte) {

    return String(
        texte ?? ""
    )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function attributHTML(texte) {

    return String(
        texte ?? ""
    )
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}


// ============================================================
// DÉMARRAGE
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await chargerProduits();

        await chargerPersonnalisation();

        await chargerReglagesLivraison();

    }
);


// ============================================================
// BOUTON ENREGISTRER LES PRODUITS
// ============================================================

document.addEventListener(
    "click",
    event => {

        const bouton =
            event.target.closest(
                "#bouton-enregistrer-produits"
            );

        if (!bouton) {
            return;
        }

        console.log(
            "🖱️ Clic sur Enregistrer les produits"
        );

        sauvegarderProduits();
    }
);
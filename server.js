// ============================================================
// PLiKA - SERVEUR
// ============================================================

require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const Stripe = require("stripe");
const nodemailer = require("nodemailer");
const { createClient } = require("@supabase/supabase-js");


// ============================================================
// SUPABASE
// ============================================================

if (
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
    console.error(
        "❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manque."
    );

    process.exit(1);
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log("✅ Supabase configuré.");


// ============================================================
// EXPRESS
// ============================================================

const app = express();

const PORT =
    process.env.PORT || 3000;


// ============================================================
// VARIABLES OBLIGATOIRES
// ============================================================

const variablesObligatoires = [
    "ADMIN_PASSWORD",
    "SESSION_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET"
];

for (
    const variable
    of variablesObligatoires
) {

    if (!process.env[variable]) {

        console.error(
            `❌ ${variable} manque dans .env`
        );

        process.exit(1);
    }
}


// ============================================================
// STRIPE
// ============================================================

const stripe =
    new Stripe(
        process.env.STRIPE_SECRET_KEY
    );


// ============================================================
// EMAIL
// ============================================================

let mailer = null;

if (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.EMAIL_EXPEDITEUR &&
    process.env.EMAIL_ADMIN
) {

    mailer =
        nodemailer.createTransport({

            host:
                process.env.SMTP_HOST,

            port:
                Number(
                    process.env.SMTP_PORT || 587
                ),

            secure:
                Number(
                    process.env.SMTP_PORT || 587
                ) === 465,

            auth: {

                user:
                    process.env.SMTP_USER,

                pass:
                    process.env.SMTP_PASS

            }

        });

    console.log(
        "✅ Service email configuré."
    );

} else {

    console.log(
        "⚠️ Service email non configuré."
    );
}


// ============================================================
// FICHIERS
// ============================================================

const PRODUCTS_FILE =
    path.join(
        __dirname,
        "products.json"
    );

const ORDERS_FILE =
    path.join(
        __dirname,
        "orders.json"
    );

const SETTINGS_FILE =
    path.join(
        __dirname,
        "settings.json"
    );


// ============================================================
// OUTILS JSON
// ============================================================

function lireJSON(
    fichier,
    valeurParDefaut
) {

    if (
        !fs.existsSync(
            fichier
        )
    ) {

        fs.writeFileSync(
            fichier,
            JSON.stringify(
                valeurParDefaut,
                null,
                4
            ),
            "utf8"
        );

        return valeurParDefaut;
    }

    try {

        return JSON.parse(
            fs.readFileSync(
                fichier,
                "utf8"
            )
        );

    } catch (erreur) {

        console.error(
            `❌ Impossible de lire ${fichier} :`,
            erreur.message
        );

        return valeurParDefaut;
    }
}


// ============================================================
// PRODUITS - SUPABASE
// ============================================================

async function lireProduits() {

    const {
        data,
        error
    } = await supabase
        .from("produits")
        .select("id, nom, prix, stock, images");

    if (error) {

        console.error(
            "❌ Erreur lecture Supabase :",
            error
        );

        throw error;
    }

    const produits =
        Array.isArray(data)
            ? data.map(produit => ({

                id:
                    String(
                        produit.id
                    ),

                nom:
                    produit.nom ||
                    "Nouveau produit",

                prix:
                    Number(
                        produit.prix || 0
                    ),

                stock:
                    Number(
                        produit.stock || 0
                    ),

                images:
                    Array.isArray(
                        produit.images
                    )
                        ? produit.images
                        : []

            }))
            : [];


    // --------------------------------------------------------
    // MIGRATION AUTOMATIQUE DE products.json
    // --------------------------------------------------------

    if (
        produits.length === 0 &&
        fs.existsSync(PRODUCTS_FILE)
    ) {

        const anciensProduits =
            lireJSON(
                PRODUCTS_FILE,
                []
            );

        if (
            Array.isArray(
                anciensProduits
            ) &&
            anciensProduits.length > 0
        ) {

            console.log(
                "📦 Migration des anciens produits vers Supabase..."
            );

            await sauvegarderProduits(
                anciensProduits
            );

            return anciensProduits;
        }
    }

    return produits;
}


// ============================================================
// SAUVEGARDER PRODUITS - SUPABASE
// ============================================================

async function sauvegarderProduits(
    produits
) {

    if (
        !Array.isArray(
            produits
        )
    ) {

        throw new Error(
            "Produits invalides."
        );
    }


    const produitsNettoyes =
        produits.map(
            produit => ({

                id:
                    String(
                        produit.id
                    ),

                nom:
                    String(
                        produit.nom ||
                        "Produit sans nom"
                    ),

                prix:
                    Number(
                        produit.prix || 0
                    ),

                stock:
                    Number(
                        produit.stock || 0
                    ),

                images:
                    Array.isArray(
                        produit.images
                    )
                        ? produit.images
                        : []

            })
        );


    // --------------------------------------------------------
    // ENVOI / MISE À JOUR
    // --------------------------------------------------------

    if (
        produitsNettoyes.length > 0
    ) {

        const {
            error
        } = await supabase
            .from("produits")
            .upsert(
                produitsNettoyes,
                {
                    onConflict:
                        "id"
                }
            );

        if (error) {

            console.error(
                "❌ Erreur sauvegarde Supabase :",
                error
            );

            throw error;
        }
    }


    // --------------------------------------------------------
    // SUPPRESSION DES PRODUITS SUPPRIMÉS DE L'ADMIN
    // --------------------------------------------------------

    const {
        data: produitsExistants,
        error: erreurLecture
    } = await supabase
        .from("produits")
        .select("id");

    if (erreurLecture) {

        throw erreurLecture;
    }


    const idsActuels =
        produitsNettoyes.map(
            produit =>
                String(
                    produit.id
                )
        );


    const idsASupprimer =
        (produitsExistants || [])
            .map(
                produit =>
                    String(
                        produit.id
                    )
            )
            .filter(
                id =>
                    !idsActuels.includes(
                        id
                    )
            );


    for (
        const id
        of idsASupprimer
    ) {

        const {
            error
        } = await supabase
            .from("produits")
            .delete()
            .eq(
                "id",
                id
            );

        if (error) {

            throw error;
        }
    }


    // --------------------------------------------------------
    // COPIE LOCALE DE SECOURS
    // --------------------------------------------------------

    try {

        fs.writeFileSync(
            PRODUCTS_FILE,
            JSON.stringify(
                produitsNettoyes,
                null,
                4
            ),
            "utf8"
        );

    } catch (erreur) {

        console.warn(
            "⚠️ Impossible d'écrire products.json :",
            erreur.message
        );
    }


    console.log(
        `✅ ${produitsNettoyes.length} produit(s) sauvegardé(s) dans Supabase.`
    );
}


// ============================================================
// COMMANDES
// ============================================================

function lireCommandes() {

    const commandes =
        lireJSON(
            ORDERS_FILE,
            []
        );


    if (
        Array.isArray(commandes) &&
        commandes.every(
            commande =>
                typeof commande ===
                "string"
        )
    ) {

        return [];
    }


    return Array.isArray(
        commandes
    )
        ? commandes
        : [];
}


function sauvegarderCommandes(
    commandes
) {

    fs.writeFileSync(
        ORDERS_FILE,
        JSON.stringify(
            commandes,
            null,
            4
        ),
        "utf8"
    );
}


// ============================================================
// RÉGLAGES
// ============================================================

function reglagesParDefaut() {

    return {

        nomSite:
            "Origami Bijoux",

        titreAccueil:
            "Bienvenue",

        texteAccueil:
            "Découvrez nos créations.",

        prixPointRelais:
            3,

        prixDomicile:
            5

    };
}


function lireReglages() {

    const anciens =
        lireJSON(
            SETTINGS_FILE,
            reglagesParDefaut()
        );


    return {

        nomSite:
            typeof anciens.nomSite ===
            "string" &&
            anciens.nomSite.trim()
                ? anciens.nomSite.trim()
                : "Origami Bijoux",

        titreAccueil:
            typeof anciens.titreAccueil ===
            "string"
                ? anciens.titreAccueil
                : "",

        texteAccueil:
            typeof anciens.texteAccueil ===
            "string"
                ? anciens.texteAccueil
                : "",

        prixPointRelais:
            Number.isFinite(
                Number(
                    anciens.prixPointRelais
                )
            )
                ? Number(
                    anciens.prixPointRelais
                )
                : 3,

        prixDomicile:
            Number.isFinite(
                Number(
                    anciens.prixDomicile
                )
            )
                ? Number(
                    anciens.prixDomicile
                )
                : 5

    };
}


function sauvegarderReglages(
    reglages
) {

    fs.writeFileSync(
        SETTINGS_FILE,
        JSON.stringify(
            reglages,
            null,
            4
        ),
        "utf8"
    );
}


// ============================================================
// TEXTE
// ============================================================

function normaliserTexte(
    texte
) {

    return String(
        texte || ""
    )
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .trim();
}


// ============================================================
// EMAIL
// ============================================================

function echapperEmail(
    texte
) {

    return String(
        texte ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


async function envoyerEmailsCommande(
    commande
) {

    if (!mailer) {

        console.log(
            "ℹ️ Email non envoyé : SMTP non configuré."
        );

        return;
    }


    const numeroCommande =
        "CMD-" +
        String(
            commande.stripeSessionId ||
            ""
        )
            .slice(-8)
            .toUpperCase();


    const produits =
        Array.isArray(
            commande.panier
        )
            ? commande.panier
            : [];


    const produitsHTML =
        produits
            .map(
                article => {

                    const quantite =
                        Number(
                            article.quantite ||
                            1
                        );

                    return `

                        <tr>

                            <td style="
                                padding:8px 0;
                                border-bottom:1px solid #eee;
                            ">

                                ${echapperEmail(
                                    article.nom ||
                                    article.id ||
                                    "Produit"
                                )}

                            </td>

                            <td style="
                                padding:8px 0;
                                text-align:right;
                                border-bottom:1px solid #eee;
                            ">

                                × ${quantite}

                            </td>

                        </tr>

                    `;
                }
            )
            .join("");


    let livraisonHTML = "";


    if (
        commande.livraison?.mode ===
        "retrait" &&
        commande.livraison.pointRetrait
    ) {

        const point =
            commande.livraison.pointRetrait;


        livraisonHTML = `

            <div style="
                background:#f7f7f7;
                border-radius:10px;
                padding:15px;
                margin-top:20px;
            ">

                <strong>
                    📍 Point de retrait
                </strong>

                <p>

                    <strong>
                        ${echapperEmail(
                            point.nom
                        )}
                    </strong>

                    <br>

                    ${echapperEmail(
                        point.adresse
                    )}

                    ${
                        point.complement
                            ? `
                                <br>
                                ${echapperEmail(
                                    point.complement
                                )}
                            `
                            : ""
                    }

                    <br>

                    ${echapperEmail(
                        point.codePostal
                    )}

                    ${echapperEmail(
                        point.ville
                    )}

                </p>

            </div>

        `;

    } else {

        livraisonHTML = `

            <div style="
                background:#f7f7f7;
                border-radius:10px;
                padding:15px;
                margin-top:20px;
            ">

                <strong>
                    🏠 Livraison à domicile
                </strong>

            </div>

        `;
    }


    const emailClient = `

        <!DOCTYPE html>

        <html lang="fr">

        <body style="
            margin:0;
            padding:20px;
            background:#f6f6f6;
            font-family:Arial,sans-serif;
        ">

            <div style="
                max-width:600px;
                margin:auto;
                background:white;
                padding:30px;
                border-radius:16px;
            ">

                <h1>
                    ${echapperEmail(
                        lireReglages().nomSite
                    )}
                </h1>

                <h2>
                    Merci pour votre commande !
                </h2>

                <p>

                    Votre commande
                    <strong>
                        ${numeroCommande}
                    </strong>
                    a bien été enregistrée.

                </p>

                <h3>
                    Votre commande
                </h3>

                <table style="
                    width:100%;
                    border-collapse:collapse;
                ">

                    ${produitsHTML}

                </table>

                ${livraisonHTML}

                <p style="
                    text-align:right;
                    font-size:20px;
                    font-weight:bold;
                ">

                    Total :

                    ${Number(
                        commande.total ||
                        0
                    )
                        .toFixed(2)
                        .replace(
                            ".",
                            ","
                        )}

                    €

                </p>

            </div>

        </body>

        </html>

    `;


    const emailAdmin = `

        <!DOCTYPE html>

        <html lang="fr">

        <body style="
            font-family:Arial,sans-serif;
        ">

            <h1>
                📦 Nouvelle commande
            </h1>

            <h2>
                ${numeroCommande}
            </h2>

            <p>

                <strong>
                    Client :
                </strong>

                ${echapperEmail(
                    commande.email ||
                    "Email inconnu"
                )}

            </p>

            <p>

                <strong>
                    Total :
                </strong>

                ${Number(
                    commande.total ||
                    0
                )
                    .toFixed(2)
                    .replace(
                        ".",
                        ","
                    )}

                €

            </p>

            ${livraisonHTML}

            <h3>
                Produits
            </h3>

            <table style="
                width:100%;
                border-collapse:collapse;
            ">

                ${produitsHTML}

            </table>

        </body>

        </html>

    `;


    if (
        commande.email
    ) {

        try {

            await mailer.sendMail({

                from:
                    process.env.EMAIL_EXPEDITEUR,

                to:
                    commande.email,

                subject:
                    `Confirmation de commande ${numeroCommande}`,

                html:
                    emailClient

            });

            console.log(
                "✅ Email client envoyé."
            );

        } catch (erreur) {

            console.error(
                "❌ Erreur email client :",
                erreur.message
            );
        }
    }


    try {

        await mailer.sendMail({

            from:
                process.env.EMAIL_EXPEDITEUR,

            to:
                process.env.EMAIL_ADMIN,

            subject:
                `📦 Nouvelle commande ${numeroCommande}`,

            html:
                emailAdmin

        });

        console.log(
            "✅ Email administrateur envoyé."
        );

    } catch (erreur) {

        console.error(
            "❌ Erreur email administrateur :",
            erreur.message
        );
    }
}


// ============================================================
// WEBHOOK STRIPE
// ============================================================

app.post(
    "/api/stripe-webhook",
    express.raw({
        type:
            "application/json"
    }),
    async (req, res) => {

        const signature =
            req.headers[
                "stripe-signature"
            ];


        let event;


        try {

            event =
                stripe.webhooks.constructEvent(
                    req.body,
                    signature,
                    process.env
                        .STRIPE_WEBHOOK_SECRET
                );

        } catch (erreur) {

            console.error(
                "❌ Signature webhook invalide :",
                erreur.message
            );

            return res.sendStatus(
                400
            );
        }


        try {

            if (
                event.type ===
                "checkout.session.completed"
            ) {

                await traiterPaiement(
                    event.data.object
                );
            }


            res.sendStatus(
                200
            );

        } catch (erreur) {

            console.error(
                "❌ Erreur webhook :",
                erreur
            );

            res.sendStatus(
                500
            );
        }
    }
);


// ============================================================
// TRAITER PAIEMENT
// ============================================================

async function traiterPaiement(
    sessionStripe
) {

    const commandes =
        lireCommandes();


    if (
        commandes.some(
            commande =>
                commande.stripeSessionId ===
                sessionStripe.id
        )
    ) {

        console.log(
            "ℹ️ Commande déjà enregistrée."
        );

        return;
    }


    if (
        !sessionStripe.metadata ||
        !sessionStripe.metadata.panier
    ) {

        throw new Error(
            "Panier absent des metadata Stripe."
        );
    }


    let panier;


    try {

        panier =
            JSON.parse(
                sessionStripe.metadata.panier
            );

    } catch {

        throw new Error(
            "Panier invalide."
        );
    }


    if (
        !Array.isArray(
            panier
        ) ||
        panier.length === 0
    ) {

        throw new Error(
            "Panier vide."
        );
    }


    // IMPORTANT :
    // Les produits viennent maintenant de Supabase

    const produits =
        await lireProduits();


    const quantites = {};


    for (
        const article
        of panier
    ) {

        const id =
            String(
                article.id
            );


        const quantite =
            Number(
                article.quantite
            );


        if (
            !Number.isInteger(
                quantite
            ) ||
            quantite < 1
        ) {

            throw new Error(
                "Quantité invalide."
            );
        }


        quantites[id] =
            (
                quantites[id] ||
                0
            ) +
            quantite;
    }


    // --------------------------------------------------------
    // VÉRIFICATION STOCK
    // --------------------------------------------------------

    for (
        const [id, quantite]
        of Object.entries(
            quantites
        )
    ) {

        const produit =
            produits.find(
                p =>
                    String(p.id) ===
                    String(id)
            );


        if (!produit) {

            throw new Error(
                `Produit introuvable : ${id}`
            );
        }


        if (
            quantite >
            Number(
                produit.stock
            )
        ) {

            throw new Error(
                `Stock insuffisant pour ${produit.nom}`
            );
        }
    }


    // --------------------------------------------------------
    // DÉCRÉMENTATION STOCK
    // --------------------------------------------------------

    for (
        const [id, quantite]
        of Object.entries(
            quantites
        )
    ) {

        const produit =
            produits.find(
                p =>
                    String(p.id) ===
                    String(id)
            );


        produit.stock -=
            quantite;
    }


    // --------------------------------------------------------
    // SAUVEGARDE SUPABASE
    // --------------------------------------------------------

    await sauvegarderProduits(
        produits
    );


    // --------------------------------------------------------
    // LIVRAISON
    // --------------------------------------------------------

    let livraison = null;


    if (
        sessionStripe.metadata.livraison
    ) {

        try {

            livraison =
                JSON.parse(
                    sessionStripe.metadata.livraison
                );

        } catch {

            livraison = null;
        }
    }


    // --------------------------------------------------------
    // COMMANDE
    // --------------------------------------------------------

    const commande = {

        stripeSessionId:
            sessionStripe.id,

        paymentIntent:
            sessionStripe.payment_intent ||
            null,

        date:
            new Date().toISOString(),

        email:
            sessionStripe
                .customer_details
                ?.email ||
            null,

        total:
            sessionStripe.amount_total
                ? sessionStripe.amount_total / 100
                : 0,

        devise:
            sessionStripe.currency ||
            "eur",

        panier,

        livraison,

        adresseLivraison:
            sessionStripe.shipping_details ||
            null,

        statut:
            "a_preparer",

        archivee:
            false
    };


    commandes.push(
        commande
    );


    sauvegarderCommandes(
        commandes
    );


    console.log(
        "✅ Paiement confirmé :",
        sessionStripe.id
    );

    console.log(
        "📦 Stock mis à jour dans Supabase."
    );

    console.log(
        "📋 Commande créée."
    );


    await envoyerEmailsCommande(
        commande
    );
}


// ============================================================
// EXPRESS JSON
// ============================================================

app.use(
    express.json({
        limit:
            "50mb"
    })
);


app.use(
    express.urlencoded({
        extended:
            true,

        limit:
            "50mb"
    })
);


// ============================================================
// SESSION
// ============================================================

app.use(
    session({

        secret:
            process.env.SESSION_SECRET,

        resave:
            false,

        saveUninitialized:
            false,

        cookie: {

            httpOnly:
                true,

            sameSite:
                "lax",

            secure:
                false,

            maxAge:
                1000 *
                60 *
                60 *
                8
        }
    })
);


// ============================================================
// CONNEXION ADMIN
// ============================================================

app.get(
    "/connexion.html",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "connexion.html"
            )
        );
    }
);


app.post(
    "/login",
    (req, res) => {

        const motDePasse =
            req.body.password;


        if (
            typeof motDePasse ===
                "string" &&
            motDePasse ===
                process.env
                    .ADMIN_PASSWORD
        ) {

            req.session.adminConnecte =
                true;


            return res.redirect(
                "/admin.html"
            );
        }


        res.redirect(
            "/connexion.html?erreur=1"
        );
    }
);


// ============================================================
// ADMIN
// ============================================================

app.get(
    "/admin.html",
    (req, res) => {

        if (
            req.session.adminConnecte !==
            true
        ) {

            return res.redirect(
                "/connexion.html"
            );
        }


        res.sendFile(
            path.join(
                __dirname,
                "admin.html"
            )
        );
    }
);


app.get(
    "/logout",
    (req, res) => {

        req.session.destroy(
            () => {

                res.redirect(
                    "/connexion.html"
                );

            }
        );
    }
);


// ============================================================
// PRODUITS PUBLICS
// ============================================================

app.get(
    "/api/products",
    async (req, res) => {

        try {

            const produits =
                await lireProduits();


            res.json(
                produits
            );

        } catch (erreur) {

            console.error(
                "❌ Chargement produits :",
                erreur
            );

            res.status(
                500
            ).json({

                erreur:
                    "Impossible de charger les produits."

            });
        }
    }
);


// ============================================================
// ADMIN PRODUITS
// ============================================================

app.post(
    "/api/admin/sync-products",
    async (req, res) => {

        if (
            req.session.adminConnecte !==
            true
        ) {

            return res.status(
                401
            ).json({

                erreur:
                    "Non autorisé."

            });
        }


        try {

            const produits =
                req.body.produits;


            if (
                !Array.isArray(
                    produits
                )
            ) {

                return res.status(
                    400
                ).json({

                    erreur:
                        "Produits invalides."

                });
            }


            await sauvegarderProduits(
                produits
            );


            res.json({

                ok:
                    true

            });

        } catch (erreur) {

            console.error(
                "❌ Erreur sauvegarde produits :",
                erreur
            );


            res.status(
                500
            ).json({

                erreur:
                    "Impossible de sauvegarder les produits."

            });
        }
    }
);


// ============================================================
// RÉGLAGES ADMIN
// ============================================================

app.get(
    "/api/admin/settings",
    (req, res) => {

        if (
            req.session.adminConnecte !==
            true
        ) {

            return res.status(
                401
            ).json({

                erreur:
                    "Non autorisé."

            });
        }


        res.json(
            lireReglages()
        );
    }
);


app.post(
    "/api/admin/settings",
    (req, res) => {

        if (
            req.session.adminConnecte !==
            true
        ) {

            return res.status(
                401
            ).json({

                erreur:
                    "Non autorisé."

            });
        }


        const anciens =
            lireReglages();


        const nomSite =
            typeof req.body.nomSite ===
            "string"
                ? req.body.nomSite.trim()
                : anciens.nomSite;


        const titreAccueil =
            typeof req.body.titreAccueil ===
            "string"
                ? req.body.titreAccueil.trim()
                : anciens.titreAccueil;


        const texteAccueil =
            typeof req.body.texteAccueil ===
            "string"
                ? req.body.texteAccueil.trim()
                : anciens.texteAccueil;


        const prixPointRelais =
            Number(
                req.body.prixPointRelais ??
                anciens.prixPointRelais
            );


        const prixDomicile =
            Number(
                req.body.prixDomicile ??
                anciens.prixDomicile
            );


        if (
            !nomSite
        ) {

            return res.status(
                400
            ).json({

                erreur:
                    "Le nom du site est obligatoire."

            });
        }


        if (
            !Number.isFinite(
                prixPointRelais
            ) ||
            prixPointRelais < 0
        ) {

            return res.status(
                400
            ).json({

                erreur:
                    "Prix point relais invalide."

            });
        }


        if (
            !Number.isFinite(
                prixDomicile
            ) ||
            prixDomicile < 0
        ) {

            return res.status(
                400
            ).json({

                erreur:
                    "Prix domicile invalide."

            });
        }


        const reglages = {

            nomSite,

            titreAccueil,

            texteAccueil,

            prixPointRelais,

            prixDomicile

        };


        sauvegarderReglages(
            reglages
        );


        res.json({

            ok:
                true,

            reglages

        });
    }
);


// ============================================================
// RÉGLAGES PUBLICS
// ============================================================

app.get(
    "/api/site-settings",
    (req, res) => {

        const reglages =
            lireReglages();


        res.json({

            nomSite:
                reglages.nomSite,

            titreAccueil:
                reglages.titreAccueil,

            texteAccueil:
                reglages.texteAccueil

        });
    }
);


// ============================================================
// COMMANDES ADMIN
// ============================================================

app.get(
    "/api/admin/orders",
    (req, res) => {

        if (
            req.session.adminConnecte !==
            true
        ) {

            return res.status(
                401
            ).json({

                erreur:
                    "Non autorisé."

            });
        }


        const commandes =
            lireCommandes()
                .sort(
                    (a, b) =>
                        new Date(
                            b.date || 0
                        ) -
                        new Date(
                            a.date || 0
                        )
                );


        res.json({

            commandes

        });
    }
);


app.patch(
    "/api/admin/orders/:stripeSessionId",
    (req, res) => {

        if (
            req.session.adminConnecte !==
            true
        ) {

            return res.status(
                401
            ).json({

                erreur:
                    "Non autorisé."

            });
        }


        const id =
            req.params
                .stripeSessionId;


        const commandes =
            lireCommandes();


        const commande =
            commandes.find(
                item =>
                    item.stripeSessionId ===
                    id
            );


        if (!commande) {

            return res.status(
                404
            ).json({

                erreur:
                    "Commande introuvable."

            });
        }


        if (
            req.body.statut !==
            undefined
        ) {

            const statutsAutorises = [

                "a_preparer",

                "preparee",

                "expediee"

            ];


            if (
                !statutsAutorises.includes(
                    req.body.statut
                )
            ) {

                return res.status(
                    400
                ).json({

                    erreur:
                        "Statut invalide."

                });
            }


            commande.statut =
                req.body.statut;
        }


        if (
            req.body.archivee !==
            undefined
        ) {

            commande.archivee =
                Boolean(
                    req.body.archivee
                );
        }


        commande.dateModification =
            new Date().toISOString();


        sauvegarderCommandes(
            commandes
        );


        res.json({

            ok:
                true,

            commande

        });
    }
);


app.delete(
    "/api/admin/orders/:stripeSessionId",
    (req, res) => {

        if (
            req.session.adminConnecte !==
            true
        ) {

            return res.status(
                401
            ).json({

                erreur:
                    "Non autorisé."

            });
        }


        const id =
            req.params
                .stripeSessionId;


        const commandes =
            lireCommandes();


        const index =
            commandes.findIndex(
                commande =>
                    commande.stripeSessionId ===
                    id
            );


        if (
            index === -1
        ) {

            return res.status(
                404
            ).json({

                erreur:
                    "Commande introuvable."

            });
        }


        commandes.splice(
            index,
            1
        );


        sauvegarderCommandes(
            commandes
        );


        res.json({

            ok:
                true

        });
    }
);


// ============================================================
// POINTS DE RETRAIT LA POSTE
// ============================================================

app.get(
    "/api/rechercher-points",
    async (req, res) => {

        try {

            const recherche =
                String(
                    req.query.recherche ||
                    ""
                ).trim();


            if (!recherche) {

                return res.status(
                    400
                ).json({

                    erreur:
                        "Veuillez saisir une recherche."

                });
            }


            const params =
                new URLSearchParams({

                    size:
                        "100",

                    q:
                        recherche

                });


            const url =
                "https://data.laposte.fr/data-fair/api/v1/datasets/laposte-poincont2/lines?" +
                params.toString();


            const reponse =
                await fetch(
                    url,
                    {

                        headers: {

                            Accept:
                                "application/json"

                        }

                    }
                );


            if (
                !reponse.ok
            ) {

                throw new Error(
                    `La Poste HTTP ${reponse.status}`
                );
            }


            const donnees =
                await reponse.json();


            const lignes =
                Array.isArray(
                    donnees.results
                )
                    ? donnees.results
                    : [];


            const rechercheNormalisee =
                normaliserTexte(
                    recherche
                );


            const points =
                lignes
                    .map(
                        point => {

                            const nom =
                                String(
                                    point.libelle_du_site ||
                                    ""
                                );


                            const adresse =
                                String(
                                    point.adresse ||
                                    ""
                                );


                            const complement =
                                String(
                                    point.complement_d_adresse ||
                                    ""
                                );


                            const codePostal =
                                String(
                                    point.code_postal ||
                                    ""
                                );


                            const ville =
                                String(
                                    point.localite ||
                                    ""
                                );


                            const texte =
                                normaliserTexte(
                                    [
                                        nom,
                                        adresse,
                                        complement,
                                        codePostal,
                                        ville
                                    ].join(" ")
                                );


                            if (
                                !texte.includes(
                                    rechercheNormalisee
                                )
                            ) {

                                return null;
                            }


                            return {

                                id:
                                    point.identifiant_a ||
                                    "",

                                nom:
                                    nom ||
                                    "Point de retrait",

                                type:
                                    point.caracteristique_du_site ||
                                    "",

                                adresse,

                                complement,

                                codePostal,

                                ville,

                                latitude:
                                    Number(
                                        point.latitude
                                    ) || null,

                                longitude:
                                    Number(
                                        point.longitude
                                    ) || null

                            };

                        }
                    )
                    .filter(
                        Boolean
                    )
                    .slice(
                        0,
                        20
                    );


            res.json({

                points

            });


        } catch (erreur) {

            console.error(
                "❌ Erreur recherche points :",
                erreur
            );


            res.status(
                500
            ).json({

                erreur:
                    "Impossible de rechercher les points de retrait."

            });
        }
    }
);


// ============================================================
// STRIPE CHECKOUT
// ============================================================

app.post(
    "/api/create-checkout-session",
    async (req, res) => {

        try {

            const panier =
                req.body.panier;


            const livraison =
                req.body.livraison;


            if (
                !Array.isArray(
                    panier
                ) ||
                panier.length === 0
            ) {

                return res.status(
                    400
                ).json({

                    erreur:
                        "Le panier est vide."

                });
            }


            if (
                !livraison ||
                (
                    livraison.mode !==
                        "retrait" &&
                    livraison.mode !==
                        "domicile"
                )
            ) {

                return res.status(
                    400
                ).json({

                    erreur:
                        "Mode de livraison invalide."

                });
            }


            if (
                livraison.mode ===
                "retrait"
            ) {

                const point =
                    livraison.pointRetrait;


                if (!point) {

                    return res.status(
                        400
                    ).json({

                        erreur:
                            "Aucun point de retrait sélectionné."

                    });
                }
            }


            // ------------------------------------------------
            // PRODUITS SUPABASE
            // ------------------------------------------------

            const produits =
                await lireProduits();


            const quantites = {};


            for (
                const article
                of panier
            ) {

                const id =
                    String(
                        article.id
                    );


                const quantite =
                    Number(
                        article.quantite
                    );


                if (
                    !Number.isInteger(
                        quantite
                    ) ||
                    quantite < 1
                ) {

                    return res.status(
                        400
                    ).json({

                        erreur:
                            "Quantité invalide."

                    });
                }


                quantites[id] =
                    (
                        quantites[id] ||
                        0
                    ) +
                    quantite;
            }


            const lineItems = [];


            for (
                const [id, quantite]
                of Object.entries(
                    quantites
                )
            ) {

                const produit =
                    produits.find(
                        p =>
                            String(p.id) ===
                            String(id)
                    );


                if (!produit) {

                    return res.status(
                        400
                    ).json({

                        erreur:
                            "Un produit n'existe plus."

                    });
                }


                if (
                    quantite >
                    Number(
                        produit.stock
                    )
                ) {

                    return res.status(
                        400
                    ).json({

                        erreur:
                            `${produit.nom} n'est plus disponible en quantité suffisante.`

                    });
                }


                const prix =
                    Number(
                        produit.prix
                    );


                if (
                    !Number.isFinite(
                        prix
                    ) ||
                    prix < 0
                ) {

                    return res.status(
                        400
                    ).json({

                        erreur:
                            "Prix produit invalide."

                    });
                }


                lineItems.push({

                    price_data: {

                        currency:
                            "eur",

                        product_data: {

                            name:
                                produit.nom

                        },

                        unit_amount:
                            Math.round(
                                prix * 100
                            )

                    },

                    quantity:
                        quantite

                });
            }


            const reglages =
                lireReglages();


            const prixLivraison =
                livraison.mode ===
                "retrait"

                    ? Number(
                        reglages
                            .prixPointRelais
                    )

                    : Number(
                        reglages
                            .prixDomicile
                    );


            const nomLivraison =
                livraison.mode ===
                "retrait"

                    ? "Point de retrait"

                    : "Livraison à domicile";


            const panierServeur =
                Object.entries(
                    quantites
                ).map(
                    (
                        [id, quantite]
                    ) => ({

                        id,

                        quantite

                    })
                );


            const options = {

                mode:
                    "payment",

                line_items:
                    lineItems,

                metadata: {

                    panier:
                        JSON.stringify(
                            panierServeur
                        ),

                    livraison:
                        JSON.stringify(
                            livraison
                        )

                },

                shipping_options: [

                    {

                        shipping_rate_data: {

                            type:
                                "fixed_amount",

                            fixed_amount: {

                                amount:
                                    Math.round(
                                        prixLivraison *
                                        100
                                    ),

                                currency:
                                    "eur"

                            },

                            display_name:
                                nomLivraison

                        }

                    }

                ],

                success_url:
                    "https://plika.onrender.com/succes.html",

                cancel_url:
                    "https://plika.onrender.com/index.html?paiement=annule",

                billing_address_collection:
                    "auto"
            };


            if (
                livraison.mode ===
                "domicile"
            ) {

                options.shipping_address_collection = {

                    allowed_countries:
                        ["FR"]

                };
            }


            const checkoutSession =
                await stripe
                    .checkout
                    .sessions
                    .create(
                        options
                    );


            res.json({

                url:
                    checkoutSession.url

            });


        } catch (erreur) {

            console.error(
                "❌ Erreur Stripe :",
                erreur
            );


            res.status(
                500
            ).json({

                erreur:
                    "Impossible de créer le paiement."

            });
        }
    }
);


// ============================================================
// FICHIERS PUBLICS
// ============================================================

app.use(
    express.static(
        __dirname
    )
);


// ============================================================
// DÉMARRAGE
// ============================================================

app.listen(
    PORT,
    () => {

        console.log("");

        console.log(
            "✅ Serveur démarré !"
        );

        console.log(
            `🌐 http://localhost:${PORT}`
        );

        console.log("");

    }
);
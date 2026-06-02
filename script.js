// =========================================================================
// FIREBASE AYARLARI (Kendi Bilgilerinle Güncel Tutabilirsin Şef)
// =========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyYOUR_ACTUAL_API_KEY",
    authDomain: "puantaj-51bda.firebaseapp.com",
    databaseURL: "https://puantaj-51bda-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "puantaj-51bda",
    storageBucket: "puantaj-51bda.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:123456789:web:abcdef"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Global Değişkenler
let aktifYil, aktifAy, toplamGunSayisi;
let tumKullanicilar = {};
let secilenDepartman = "Herkesi Göster";

// Sayfa İlk Açıldığında Çalışacak Motor
window.onload = function() {
    SaatVeTarihMotoru();
    
    // Varsayılan olarak geçerli ayı seçtir
    const bugun = new Date();
    const buAyStr = bugun.getFullYear() + "-" + String(bugun.getMonth() + 1).padStart(2, '0');
    document.getElementById("calismaDonemi").value = buAyStr;
    
    donemDegisti();
};

// Dönem Değiştiğinde Tabloyu Yeniden İnşa Eden Fonksiyon
function donemDegisti() {
    const donemDegeri = document.getElementById("calismaDonemi").value;
    if (!donemDegeri) return;

    const parts = donemDegeri.split("-");
    aktifYil = parseInt(parts[0]);
    aktifAy = parseInt(parts[1]);

    toplamGunSayisi = new Date(aktifYil, aktifAy, 0).getDate();

    TabloBasliklariniOlustur();
    VerileriGeriYukle();
}

// Masaüstü Arama Motoru
function personelAraMasaustu() {
    const aramaMetni = document.getElementById("tablePersonnelSearch").value.toLowerCase().trim();
    const satirlar = document.querySelectorAll("#tabloGövdeSatirlari tr");

    satirlar.forEach(satir => {
        const isimHucresi = satir.querySelector(".sticky-col");
        if (isimHucresi) {
            const isim = isimHucresi.innerText.toLowerCase();
            if (isim.includes(aramaMetni)) {
                satir.style.display = "";
            } else {
                satir.style.display = "none";
            }
        }
    });
}

// Departman Filtreleme İşlemi
function departmanFiltrele(deptName) {
    secilenDepartman = deptName;
    
    // Butonların aktiflik durumunu güncelle
    const butonlar = document.querySelectorAll("#filterButtonsGroup .btn-filter");
    butonlar.forEach(btn => {
        if (btn.innerText === deptName) btn.classList.add("active");
        else btn.classList.remove("active");
    });

    TabloGövdesiniDoldur();
}

// Masaüstü Tablo Başlık Hücrelerini Ayarlama (1 Pzt, 2 Sal vs.)
function TabloBasliklariniOlustur() {
    const baslikSatiri = document.getElementById("tabloBaslikSatiri");
    
    let html = `<th class="sticky-col" style="z-index:6; text-align:center;">Personel & Görev Dağılımı</th>`;
    
    const gunAdlari = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

    for (let i = 1; i <= toplamGunSayisi; i++) {
        const tarihObj = new Date(aktifYil, aktifAy - 1, i);
        const gunIndeks = tarihObj.getDay();
        const gunAdi = gunAdlari[gunIndeks];

        let ekstraSinif = "";
        if (gunIndeks === 0 || gunIndeks === 6) ekstraSinif = "weekend";

        html += `<th class="day-th ${ekstraSinif}">${i} <span>${gunAdi}</span></th>`;
    }
    
    baslikSatiri.innerHTML = html;
}

// Firebase'den Verileri Çeken Alan
function VerileriGeriYukle() {
    db.ref("personeller").on("value", (snapshot) => {
        tumKullanicilar = snapshot.val() || {};
        TabloGövdesiniDoldur();
    });
}

// =========================================================================
// GÜNCELLENEN VE HİZALANAN TABLO GÖVDESİ (TAM İSTEDİĞİN GİBİ)
// =========================================================================
function TabloGövdesiniDoldur() {
    const govde = document.getElementById("tabloGövdeSatirlari");
    govde.innerHTML = "";

    const donemKey = aktifYil + "_" + String(aktifAy).padStart(2, '0');

    Object.keys(tumKullanicilar).forEach(perId => {
        const p = tumKullanicilar[perId];
        
        // Departman Filtre Kontrolü
        if (secilenDepartman !== "Herkesi Göster" && p.departman !== secilenDepartman) {
            return; 
        }

        let satirHtml = `<tr>`;
        
        // TAMAMI HİZALANMIŞ VE KUSURSUZ SOL İSİM KOLONU
        satirHtml += `
            <td class="sticky-col">
                <div class="personnel-cell-wrapper">
                    <div class="personnel-info">
                        <strong>${p.adSoyad}</strong>
                        <span>${p.departman}</span>
                    </div>
                    <div class="badge-and-actions">
                        <span class="total-hours-badge">+4 Sa</span>
                        <div class="cell-actions">
                            <button class="btn-per-edit" onclick="personelDuzenleHazirlik('${perId}')"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="btn-per-delete" onclick="personelSil('${perId}')"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </div>
                </div>
            </td>
        `;

        // Gün Hücrelerini Döngüyle Oluşturma
        const pDonemi = p.puantaj && p.puantaj[donemKey] ? p.puantaj[donemKey] : {};

        for (let g = 1; g <= toplamGunSayisi; g++) {
            const durum = pDonemi[g] ? pDonemi[g].durum : "BOS";
            
            const tarihObj = new Date(aktifYil, aktifAy - 1, g);
            let h_sinif = "";
            if (tarihObj.getDay() === 0 || tarihObj.getDay() === 6) h_sinif = "weekend";

            satirHtml += `
                <td class="${h_sinif}">
                    <button class="day-btn ${durum}" onclick="durumSecimPenceresi('${perId}', ${g})">
                        ${durum === "BOS" ? "" : (durum === "GELDI" ? "G" : (durum === "GELMEDI" ? "X" : durum.charAt(0)))}
                    </button>
                </td>
            `;
        }

        satirHtml += `</tr>`;
        govde.innerHTML += satirHtml;
    });
}

// Personel Kaydetme / Ekleme
function personelKaydet(event) {
    event.preventDefault();
    const id = document.getElementById("editPersonelId").value;
    const adSoyad = document.getElementById("perAdSoyad").value.trim();
    const departman = document.getElementById("perDepartman").value;

    if (id) {
        db.ref("personeller/" + id).update({ adSoyad, departman });
        document.getElementById("editPersonelId").value = "";
        document.getElementById("btnPersonelSubmit").innerHTML = `<i class="fa-solid fa-plus"></i> Yeni Personel Tanımla`;
    } else {
        const yeniRef = db.ref("personeller").push();
        yeniRef.set({ adSoyad, departman, puantaj: {} });
    }

    document.getElementById("personelForm").reset();
}

// Düzenleme Hazırlığı
function personelDuzenleHazirlik(id) {
    const p = tumKullanicilar[id];
    document.getElementById("editPersonelId").value = id;
    document.getElementById("perAdSoyad").value = p.adSoyad;
    document.getElementById("perDepartman").value = p.departman;
    document.getElementById("btnPersonelSubmit").innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Değişiklikleri Güncelle`;
}

// Personel Silme
function personelSil(id) {
    if(confirm("Bu personeli ve tüm puantaj geçmişini silmek istediğinize emin misiniz?")) {
        db.ref("personeller/" + id).remove();
    }
}

// Modal Pencere Tetikleyicileri
function durumSecimPenceresi(perId, gunNo) {
    const p = tumKullanicilar[perId];
    document.getElementById("modalPersonelId").value = perId;
    document.getElementById("modalGunNo").value = gunNo;
    document.getElementById("modalPersonelIsim").innerText = p.adSoyad;
    document.getElementById("modalTarihBilgi").innerText = gunNo + " " + document.getElementById("live-date-month").innerText + " " + aktifYil;

    const donemKey = aktifYil + "_" + String(aktifAy).padStart(2, '0');
    const mevcutDurum = p.puantaj && p.puantaj[donemKey] && p.puantaj[donemKey][gunNo] ? p.puantaj[donemKey][gunNo].durum : "BOS";
    const mevcutSaat = p.puantaj && p.puantaj[donemKey] && p.puantaj[donemKey][gunNo] ? p.puantaj[donemKey][gunNo].saat : 7.5;

    document.getElementById("modalDurumSelect").value = mevcutDurum;
    document.getElementById("modalCalismaSaat").value = mevcutSaat;

    modalDurumSenaryoKontrol();
    document.getElementById("durumModal").style.display = "block";
}

function modalDurumSenaryoKontrol() {
    const d = document.getElementById("modalDurumSelect").value;
    if(d === "GELDI") {
        document.getElementById("mesaiSaatleriAlani").style.display = "block";
    } else {
        document.getElementById("mesaiSaatleriAlani").style.display = "none";
    }
}

// Modal Kapatma
function modalKapat() { document.getElementById("durumModal").style.display = "none"; }

// Durum Kaydetme
function durumKaydet() {
    const perId = document.getElementById("modalPersonelId").value;
    const gunNo = document.getElementById("modalGunNo").value;
    const durum = document.getElementById("modalDurumSelect").value;
    const saat = parseFloat(document.getElementById("modalCalismaSaat").value) || 0;

    const donemKey = aktifYil + "_" + String(aktifAy).padStart(2, '0');

    db.ref("personeller/" + perId + "/puantaj/" + donemKey + "/" + gunNo).set({
        durum: durum,
        saat: durum === "GELDI" ? saat : 0
    });

    modalKapat();
}

// PREMIUM SAAT VE TARİH MOTORU
function SaatVeTarihMotoru() {
    const aylar = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
    const gunler = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    
    setInterval(() => {
        const zaman = new Date();
        document.getElementById("live-time").innerText = zaman.toTimeString().split(" ")[0];
        document.getElementById("live-date-day").innerText = String(zaman.getDate()).padStart(2, '0');
        document.getElementById("live-date-month").innerText = aylar[zaman.getMonth()];
        document.getElementById("live-date-year").innerText = zaman.getFullYear() + ", " + gunler[zaman.getDay()];
    }, 1000);
}

// Ekstra Özellik Fonksiyonları (İhtiyaca Göre Düzenlenebilir)
function excelRaporuAl() { alert("Excel raporu hazırlanıyor..."); }
function gelmeyenleriListele() { alert("Bugün gelmeyen personeller filtreleniyor..."); }

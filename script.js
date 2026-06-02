// =========================================================================
// FIREBASE AYARLARI (Bulut Veritabanı Bağlantısı)
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

// Firebase başlatma kontrolü
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// Global Durum Değişkenleri
let aktifYil, aktifAy, toplamGunSayisi;
let tumKullanicilar = {};
let secilenDepartman = "HEPSİ";
let mobilSeciliGun = 1; 

// Uygulama Başlangıç Motoru
window.onload = function() {
    SaatVeTarihMotoru();
    FirebaseBaglantiDurumuDinle();
    
    // Varsayılan olarak içinde bulunulan ayı ata (Örn: 2026-06)
    const bugun = new Date();
    const buAyStr = bugun.getFullYear() + "-" + String(bugun.getMonth() + 1).padStart(2, '0');
    document.getElementById("donemSecici").value = buAyStr;
    
    mobilSeciliGun = bugun.getDate(); 
    donemDegisti();
};

// Multi-Device Canlı Bağlantı Takibi
function FirebaseBaglantiDurumuDinle() {
    db.ref(".info/connected").on("value", (snap) => {
        const dot = document.getElementById("sync-status-dot");
        const txt = document.getElementById("sync-status-text");
        if (!dot || !txt) return;
        if (snap.val() === true) {
            dot.style.background = "#10b981"; 
            dot.style.boxShadow = "0 0 8px #10b981";
            txt.innerText = "Bulut Eşitleme Aktif (Multi-Device)";
        } else {
            dot.style.background = "#ef4444"; 
            dot.style.boxShadow = "0 0 8px #ef4444";
            txt.innerText = "Bağlantı Kesildi / Aranıyor...";
        }
    });
}

// Dönem Değiştiğinde Takvimi Yeniden İnşa Eden Fonksiyon
function donemDegisti() {
    const donemDegeri = document.getElementById("donemSecici").value;
    if (!donemDegeri) return;

    const parts = donemDegeri.split("-");
    aktifYil = parseInt(parts[0]);
    aktifAy = parseInt(parts[1]);

    // Seçilen ayın kaç gün çektiğini bul (28, 29, 30, 31)
    toplamGunSayisi = new Date(aktifYil, aktifAy, 0).getDate();
    if (mobilSeciliGun > toplamGunSayisi) mobilSeciliGun = toplamGunSayisi;

    TabloBasliklariniOlustur();
    MobilGunSeridiOlustur();
    VerileriGeriYukle();
}

// Masaüstü Hızlı İsim Arama
function aramaYap() {
    const aramaMetni = document.getElementById("panelAramaKutusu").value.toLowerCase().trim();
    const satirlar = document.querySelectorAll("#tabloGövdeSatirlari tr");

    satirlar.forEach(satir => {
        const isimHucresi = satir.querySelector(".sticky-col strong");
        if (isimHucresi) {
            if (isimHucresi.innerText.toLowerCase().includes(aramaMetni)) {
                satir.style.display = "";
            } else {
                satir.style.display = "none";
            }
        }
    });
}

// Telefon (Mobil) Hızlı İsim Arama
function aramaYapMobil() {
    const aramaMetni = document.getElementById("mobilAramaKutusu").value.toLowerCase().trim();
    const kartlar = document.querySelectorAll("#mobilKartKapsayici .mobile-personnel-card");

    kartlar.forEach(kart => {
        const isimHucresi = kart.querySelector(".mobile-card-info strong");
        if (isimHucresi) {
            if (isimHucresi.innerText.toLowerCase().includes(aramaMetni)) {
                kart.style.display = "";
            } else {
                kart.style.display = "none";
            }
        }
    });
}

// Ortak Departman Filtreleme Motoru (Hem Masaüstü Hem Mobil Listeyi Tetikler)
function filtreleDepartman(deptName, butonElement) {
    secilenDepartman = deptName;
    const butonlar = document.querySelectorAll("#departmanFiltreGrubu .btn-filter");
    butonlar.forEach(btn => btn.classList.remove("active"));
    if (butonElement) butonElement.classList.add("active");

    TabloGövdesiniDoldur();
    MobilKartlariniDoldur();
    GelmeyenSayisiniGuncelle();
}

// Masaüstü Gün Sütunlarını Çizen Fonksiyon
function TabloBasliklariniOlustur() {
    const baslikSatiri = document.getElementById("tabloBaslikSatiri");
    if (!baslikSatiri) return;
    let html = `<th class="sticky-col" style="z-index:6; text-align:center;">Personel & Görev Dağılımı</th>`;
    const gunAdlari = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

    for (let i = 1; i <= toplamGunSayisi; i++) {
        const tarihObj = new Date(aktifYil, aktifAy - 1, i);
        const gunIndeks = tarihObj.getDay();
        const gunAdi = gunAdlari[gunIndeks];

        let ekstraSinif = "";
        if (gunIndeks === 0 || gunIndeks === 6) {
            ekstraSinif = "weekend";
        }
        html += `<th class="day-th ${ekstraSinif}">${i} <span>${gunAdi}</span></th>`;
    }
    baslikSatiri.innerHTML = html;
}

// Telefon (Mobil) Üst Yatay Gün Şeridini Kuran Fonksiyon
function MobilGunSeridiOlustur() {
    const serit = document.getElementById("mobilGunSeridi");
    if (!serit) return;
    serit.innerHTML = "";
    const gunAdlari = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

    for (let i = 1; i <= toplamGunSayisi; i++) {
        const tarihObj = new Date(aktifYil, aktifAy - 1, i);
        const gunAdi = gunAdlari[tarihObj.getDay()];
        let aktifClass = (i === mobilSeciliGun) ? "active" : "";
        let weekendClass = (tarihObj.getDay() === 0 || tarihObj.getDay() === 6) ? "weekend" : "";

        serit.innerHTML += `
            <div class="mobile-day-capsule ${aktifClass} ${weekendClass}" onclick="mobilGunSec(${i})">
                <span class="mob-num">${i}</span>
                <span class="mob-txt">${gunAdi}</span>
            </div>
        `;
    }
}

// Mobil Gün Şeridinden Gün Seçildiğinde Tetiklenen Buton Fonksiyonu
function mobilGunSec(gunNo) {
    mobilSeciliGun = gunNo;
    const kapsuller = document.querySelectorAll("#mobilGunSeridi .mobile-day-capsule");
    kapsuller.forEach((k, idx) => {
        if ((idx + 1) === gunNo) k.classList.add("active");
        else k.classList.remove("active");
    });
    MobilKartlariniDoldur();
    GelmeyenSayisiniGuncelle();
}

// Canlı Veritabanı Dinleyicisi (Realtime Database Sync)
function VerileriGeriYukle() {
    db.ref("personeller").on("value", (snapshot) => {
        tumKullanicilar = snapshot.val() || {};
        TabloGövdesiniDoldur();
        MobilKartlariniDoldur();
        GelmeyenSayisiniGuncelle();
    });
}

// Bir Personelin İlgili Döneme Ait Toplam Fazla Mesai Saatini Hesaplar
function ToplamFazlaMesaiHesapla(personelObj, donemKey) {
    let toplam = 0;
    if (personelObj.puantaj && personelObj.puantaj[donemKey]) {
        Object.keys(personelObj.puantaj[donemKey]).forEach(gun => {
            const kayit = personelObj.puantaj[donemKey][gun];
            if (kayit && kayit.durum === "GELDI" && kayit.fazlaMesai) {
                toplam += parseFloat(kayit.fazlaMesai) || 0;
            }
        });
    }
    return toplam;
}

// Masaüstü Tablo Veri Yapısını Basan Fonksiyon
function TabloGövdesiniDoldur() {
    const govde = document.getElementById("tabloGövdeSatirlari");
    if (!govde) return;
    govde.innerHTML = "";
    const donemKey = aktifYil + "_" + String(aktifAy).padStart(2, '0');

    Object.keys(tumKullanicilar).forEach(perId => {
        const p = tumKullanicilar[perId];
        if (secilenDepartman !== "HEPSİ" && p.departman !== secilenDepartman) return;

        const fMesai = ToplamFazlaMesaiHesapla(p, donemKey);
        let satirHtml = `<tr>`;
        
        // Sabit sütun - Rozet düzenlemesi uygulandı (Örn: "4 Saat")
        satirHtml += `
            <td class="sticky-col">
                <div class="personnel-cell-wrapper">
                    <div class="personnel-info" onclick="mesaiDetayModaliAc('${perId}')" style="cursor:pointer;">
                        <strong>${p.adSoyad}</strong>
                        <span>${p.departman}</span>
                    </div>
                    <div class="badge-and-actions">
                        <span class="total-hours-badge" onclick="mesaiDetayModaliAc('${perId}')">${fMesai} Saat</span>
                        <div class="cell-actions">
                            <button class="btn-per-edit" onclick="personelDuzenleHazirlik('${perId}')" title="Düzenle"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="btn-per-delete" onclick="personelSil('${perId}')" title="Sil"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </div>
                </div>
            </td>
        `;

        const pDonemi = p.puantaj && p.puantaj[donemKey] ? p.puantaj[donemKey] : {};
        for (let g = 1; g <= toplamGunSayisi; g++) {
            const kayit = pDonemi[g] || { durum: "BOS" };
            const durum = kayit.durum;
            
            const tarihObj = new Date(aktifYil, aktifAy - 1, g);
            let h_sinif = "";
            if (tarihObj.getDay() === 0 || tarihObj.getDay() === 6) h_sinif = "weekend";

            let butonIcerik = "-";
            if (durum === "GELDI") {
                const fmYazi = kayit.fazlaMesai > 0 ? `+${kayit.fazlaMesai}` : "";
                butonIcerik = `<span class="d-text">G</span>${fmYazi ? '<span class="fm-sub">'+fmYazi+'</span>' : ''}`;
            } else if (durum === "GELMEDI") butonIcerik = "YOK";
            else if (durum === "H_IZIN") butonIcerik = "H.İ";
            else if (durum === "Y_IZIN") butonIcerik = "Y.İ";
            else if (durum === "C_IZIN") butonIcerik = "C.İ";
            else if (durum === "RAPOR") butonIcerik = "R";

            satirHtml += `
                <td class="${h_sinif}">
                    <button class="day-btn ${durum}" onclick="durumSecimPenceresi('${perId}', ${g})">
                        ${butonIcerik}
                    </button>
                </td>
            `;
        }

        satirHtml += `</tr>`;
        govde.innerHTML += satirHtml;
    });
}

// Telefon (Mobil) Kart Görünümünü ve Buton Fonksiyonlarını Basan Alan
function MobilKartlariniDoldur() {
    const kapsayici = document.getElementById("mobilKartKapsayici");
    if (!kapsayici) return;
    kapsayici.innerHTML = "";

    const donemKey = aktifYil + "_" + String(aktifAy).padStart(2, '0');

    Object.keys(tumKullanicilar).forEach(perId => {
        const p = tumKullanicilar[perId];
        if (secilenDepartman !== "HEPSİ" && p.departman !== secilenDepartman) return;

        const pDonemi = p.puantaj && p.puantaj[donemKey] ? p.puantaj[donemKey] : {};
        const gunlukKayit = pDonemi[mobilSeciliGun] || { durum: "BOS", normalMesai: 9, fazlaMesai: 0 };
        const durum = gunlukKayit.durum;

        let durumMetni = "Boş Bırakılmış";
        let durumRenkClass = "mob-bos";
        if (durum === "GELDI") { 
            durumMetni = `Geldi (${gunlukKayit.normalMesai}s ${gunlukKayit.fazlaMesai > 0 ? '+'+gunlukKayit.fazlaMesai+'s' : ''})`; 
            durumRenkClass = "mob-geldi"; 
        }
        else if (durum === "GELMEDI") { durumMetni = "Gelmedi (YOK)"; durumRenkClass = "mob-gelmedi"; }
        else if (durum === "H_IZIN") { durumMetni = "Haftalık İzin"; durumRenkClass = "mob-hizin"; }
        else if (durum === "Y_IZIN") { durumMetni = "Yıllık İzin"; durumRenkClass = "mob-yizin"; }
        else if (durum === "C_IZIN") { durumMetni = "Cenaze İzni"; durumRenkClass = "mob-cizin"; }
        else if (durum === "RAPOR") { durumMetni = "Sağlık Raporu"; durumRenkClass = "mob-rapor"; }

        kapsayici.innerHTML += `
            <div class="mobile-personnel-card">
                <div class="mobile-card-main-row">
                    <div class="mobile-card-info" onclick="mesaiDetayModaliAc('${perId}')" style="cursor:pointer; flex:1;">
                        <strong>${p.adSoyad}</strong>
                        <span>${p.departman}</span>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center; flex-shrink:0;">
                        <button class="day-btn-mobile ${durumRenkClass}" onclick="durumSecimPenceresi('${perId}', ${mobilSeciliGun})">
                            ${durumMetni}
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
}

// Personel Ekleme / Güncelleme Buton Aksiyonu
function personelEkle() {
    const id = document.getElementById("editPersonelId").value;
    const adSoyad = document.getElementById("perAdSoyad").value.trim();
    const departman = document.getElementById("perGrup").value;

    if (!adSoyad) { alert("Lütfen Personel Adı Soyadı alanını doldurunuz."); return; }

    if (id) {
        db.ref("personeller/" + id).update({ adSoyad, departman })
        .then(() => {
            document.getElementById("editPersonelId").value = "";
            document.getElementById("perAdSoyad").value = "";
            document.getElementById("btnPersonelSubmit").innerHTML = `<i class="fa-solid fa-plus"></i> Yeni Personel Tanımla`;
        });
    } else {
        const yeniRef = db.ref("personeller").push();
        yeniRef.set({ adSoyad, departman, puantaj: {} })
        .then(() => {
            document.getElementById("perAdSoyad").value = "";
        });
    }
}

// Düzenle Butonuna Basıldığında Formu Dolduran Yapı
function personelDuzenleHazirlik(id) {
    const p = tumKullanicilar[id];
    document.getElementById("editPersonelId").value = id;
    document.getElementById("perAdSoyad").value = p.adSoyad;
    document.getElementById("perGrup").value = p.departman;
    document.getElementById("btnPersonelSubmit").innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Değişiklikleri Güncelle`;
    
    // Mobilde ise formu görebilmesi için yukarı kaydır
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Personel Silme İşlemi
function personelSil(id) {
    if(confirm("Bu personeli ve tüm puantaj geçmişini silmek istediğinize emin misiniz?")) {
        db.ref("personeller/" + id).remove();
    }
}

// Günlük Hücre Tıklama Modalı (Masaüstü ve Mobil Ortak Kullanır)
function durumSecimPenceresi(perId, gunNo) {
    const p = tumKullanicilar[perId];
    document.getElementById("modalPersonelId").value = perId;
    document.getElementById("modalGunNo").value = gunNo;
    document.getElementById("modalBaslik").innerText = p.adSoyad + " - " + gunNo + ". Gün";
    
    const ayAdlari = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    document.getElementById("modalTarihBilgi").innerText = gunNo + " " + ayAdlari[aktifAy - 1] + " " + aktifYil;

    const donemKey = aktifYil + "_" + String(aktifAy).padStart(2, '0');
    const kayit = p.puantaj && p.puantaj[donemKey] && p.puantaj[donemKey][gunNo] ? p.puantaj[donemKey][gunNo] : {};
    
    const mevcutDurum = kayit.durum || "BOS";
    const mevcutNormal = kayit.normalMesai !== undefined ? kayit.normalMesai : 9;
    const mevcutFazla = kayit.fazlaMesai !== undefined ? kayit.fazlaMesai : 0;

    document.getElementById("modalDurum").value = mevcutDurum;
    document.getElementById("modalNormalMesai").value = mevcutNormal;
    document.getElementById("modalFazlaMesai").value = mevcutFazla;

    modalDurumSenaryoKontrol(mevcutDurum);
    document.getElementById("chefModal").style.display = "block";
}

// Duruma göre saat kutularını açıp kapatan motor
function modalDurumSenaryoKontrol(durumKodu) {
    if(durumKodu === "GELDI") {
        document.getElementById("normalMesaiAlani").style.display = "block";
        document.getElementById("fazlaMesaiAlani").style.display = "block";
    } else {
        document.getElementById("normalMesaiAlani").style.display = "none";
        document.getElementById("fazlaMesaiAlani").style.display = "none";
    }
}

function modalKapat() { document.getElementById("chefModal").style.display = "none"; }

// Modal İçindeki "Değişiklikleri İşle" Buton Aksiyonu
function gunlukVeriKaydet() {
    const perId = document.getElementById("modalPersonelId").value;
    const gunNo = document.getElementById("modalGunNo").value;
    const durum = document.getElementById("modalDurum").value;
    const nMesai = parseFloat(document.getElementById("modalNormalMesai").value) || 0;
    const fMesai = parseFloat(document.getElementById("modalFazlaMesai").value) || 0;

    const donemKey = aktifYil + "_" + String(aktifAy).padStart(2, '0');
    const veri = { durum: durum };
    
    if (durum === "GELDI") {
        veri.normalMesai = nMesai;
        veri.fazlaMesai = fMesai;
    } else {
        veri.normalMesai = 0;
        veri.fazlaMesai = 0;
    }

    db.ref("personeller/" + perId + "/puantaj/" + donemKey + "/" + gunNo).set(veri)
    .then(() => {
        modalKapat();
    });
}

// Üst Kısımdaki Gelmeyenler Buton Sayacını Günceller
function GelmeyenSayisiniGuncelle() {
    const donemKey = aktifYil + "_" + String(aktifAy).padStart(2, '0');
    let gelmeyenSayisi = 0;

    Object.keys(tumKullanicilar).forEach(perId => {
        const p = tumKullanicilar[perId];
        if (secilenDepartman !== "HEPSİ" && p.departman !== secilenDepartman) return;

        const pDonemi = p.puantaj && p.puantaj[donemKey] ? p.puantaj[donemKey] : {};
        const durum = pDonemi[mobilSeciliGun] ? pDonemi[mobilSeciliGun].durum : "BOS";
        if (durum === "GELMEDI") gelmeyenSayisi++;
    });

    document.getElementById("gelmeyenButonMetni").innerText = `Gelmeyenler (${gelmeyenSayisi})`;
}

// Gelmeyen Personel Listesi Penceresini Açar
function gelmeyenlerModaliAc() {
    const listeAlani = document.getElementById("gelmeyenlerSirketListesi");
    if(!listeAlani) return;
    listeAlani.innerHTML = "";

    const ayAdlari = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    document.getElementById("gelmeyenlerModalTarih").innerText = mobilSeciliGun + " " + ayAdlari[aktifAy - 1] + " " + aktifYil + " Eksik Çetele";

    const donemKey = aktifYil + "_" + String(aktifAy).padStart(2, '0');
    let sayac = 0;

    Object.keys(tumKullanicilar).forEach(perId => {
        const p = tumKullanicilar[perId];
        if (secilenDepartman !== "HEPSİ" && p.departman !== secilenDepartman) return;

        const pDonemi = p.puantaj && p.puantaj[donemKey] ? p.puantaj[donemKey] : {};
        const durum = pDonemi[mobilSeciliGun] ? pDonemi[mobilSeciliGun].durum : "BOS";

        if (durum === "GELMEDI") {
            sayac++;
            listeAlani.innerHTML += `
                <div class="mesai-detay-item">
                    <div class="detay-tarih">
                        <strong>${p.adSoyad}</strong>
                        <span style="font-size:11px; color:#64748b; display:block;">${p.departman}</span>
                    </div>
                    <div class="detay-saatler">
                        <span style="background:#fee2e2; color:#ef4444; font-size:11px; font-weight:700; padding:4px 8px; border-radius:6px;">GELMEDİ</span>
                    </div>
                </div>
            `;
        }
    });

    if (sayac === 0) {
        listeAlani.innerHTML = `<p style="text-align:center; color:#64748b; padding:20px 0;">Bugün işe gelmeyen personel bulunmuyor şefim!</p>`;
    }
    document.getElementById("gelmeyenlerModal").style.display = "block";
}

function gelmeyenlerModalKapat() { document.getElementById("gelmeyenlerModal").style.display = "none"; }

// GÜNCELLEME: İSMİN ÜSTÜNE TIKLANDIĞINDA SADECE MESAİ GİRİLENLERİ LİSTELEYEN MESAİ RAPORU MODALI
function mesaiDetayModaliAc(perId) {
    const p = tumKullanicilar[perId];
    document.getElementById("detayModalPersonelAdi").innerText = p.adSoyad;
    
    const ayAdlari = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    document.getElementById("detayModalDonemYazi").innerText = ayAdlari[aktifAy - 1] + " " + aktifYil + " Mesai Raporu";

    const listeAlani = document.getElementById("mesaiDetayListesi");
    listeAlani.innerHTML = "";

    const donemKey = aktifYil + "_" + String(aktifAy).padStart(2, '0');
    const pDonemi = p.puantaj && p.puantaj[donemKey] ? p.puantaj[donemKey] : {};

    let toplamCalisma = 0;
    let toplamFazla = 0;
    let mesaiVarMi = false;

    let satirHtml = "";
    for (let i = 1; i <= toplamGunSayisi; i++) {
        const kayit = pDonemi[i] || { durum: "BOS", normalMesai: 0, fazlaMesai: 0 };
        
        // FİLTRELEME: Sadece GELDI olan ve saat verisi barındıran mesailer listelenir.
        if (kayit.durum !== "GELDI" || (parseInt(kayit.normalMesai) === 0 && parseInt(kayit.fazlaMesai) === 0)) {
            continue; 
        }

        mesaiVarMi = true;
        toplamCalisma += (kayit.normalMesai || 0);
        toplamFazla += (kayit.fazlaMesai || 0);

        satirHtml += `
            <div class="mesai-detay-item">
                <div class="detay-tarih">
                    <strong>${i.toString().padStart(2,'0')}.${String(aktifAy).padStart(2,'0')}.${aktifYil}</strong>
                </div>
                <div class="detay-saatler">
                    <span class="normal-saat-yazi">${kayit.normalMesai} Sa</span>
                    <span class="fazla-saat-yazi">+${kayit.fazlaMesai} Sa</span>
                </div>
            </div>
        `;
    }

    let ozetHtml = `
        <div style="background:#f8fafc; padding:12px; border-radius:12px; margin-bottom:14px; display:flex; justify-content:space-between; border:1px solid #e2e8f0;">
            <div><span style="font-size:11px; color:#64748b; display:block;">Normal Mesai</span><strong style="color:#1e293b; font-size:15px;">${toplamCalisma} Sa</strong></div>
            <div><span style="font-size:11px; color:#64748b; display:block;">Toplam FM</span><strong style="color:#16a34a; font-size:15px;">+${toplamFazla} Sa</strong></div>
        </div>
    `;

    if (!mesaiVarMi) {
        listeAlani.innerHTML = `<p style="text-align:center; color:#64748b; padding:20px 0;">Bu aya ait işlenmiş aktif çalışma saati kaydı bulunamadı.</p>`;
    } else {
        listeAlani.innerHTML = ozetHtml + satirHtml;
    }
    
    document.getElementById("mesaiDetayModal").style.display = "block";
}

function mesaiDetayModalKapat() { document.getElementById("mesaiDetayModal").style.display = "none"; }

// Canlı Premium Saat Sistemi
function SaatVeTarihMotoru() {
    const aylar = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
    const gunler = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    
    setInterval(() => {
        const zaman = new Date();
        if(document.getElementById("live-time")) {
            document.getElementById("live-time").innerText = zaman.toTimeString().split(" ")[0];
            document.getElementById("live-date-day").innerText = String(zaman.getDate()).padStart(2, '0');
            document.getElementById("live-date-month").innerText = aylar[zaman.getMonth()];
            document.getElementById("live-date-year").innerText = zaman.getFullYear() + ", " + gunler[zaman.getDay()];
        }
    }, 1000);
}

// Şirket Standartlarında Excel Çıktı Motoru
function excelAktar() {
    if (Object.keys(tumKullanicilar).length === 0) { alert("Rapora aktarılacak personel verisi bulunamadı!"); return; }
    
    const donemKey = aktifYil + "_" + String(aktifAy).padStart(2, '0');
    const ayAdlari = ["Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran", "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik"];
    
    let basliklar = ["Personel Adı Soyadı", "Departman / Görev"];
    for (let i = 1; i <= toplamGunSayisi; i++) { basliklar.push(i + "." + ayAdlari[aktifAy-1].substring(0,3)); }
    basliklar.push("Toplam Normal Saati", "Toplam Fazla Mesai Saati");

    let excelData = [basliklar];

    Object.keys(tumKullanicilar).forEach(perId => {
        const p = tumKullanicilar[perId];
        if (secilenDepartman !== "HEPSİ" && p.departman !== secilenDepartman) return;
        
        let satir = [p.adSoyad, p.departman];
        let nToplam = 0;
        let fToplam = 0;
        const pDonemi = p.puantaj && p.puantaj[donemKey] ? p.puantaj[donemKey] : {};

        for (let g = 1; g <= toplamGunSayisi; g++) {
            const kayit = pDonemi[g] || { durum: "BOS", normalMesai: 0, fazlaMesai: 0 };
            if (kayit.durum === "GELDI") {
                satir.push(`G (${kayit.normalMesai}${kayit.fazlaMesai > 0 ? '+' + kayit.fazlaMesai : ''})`);
                nToplam += kayit.normalMesai;
                fToplam += kayit.fazlaMesai;
            } else if (kayit.durum === "BOS") satir.push("-");
            else satir.push(kayit.durum);
        }

        satir.push(nToplam, fToplam);
        excelData.push(satir);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, "Puantaj Raporu");
    
    const dosyaAdi = `ED_Yazilim_Puantaj_Raporu_${donemKey}.xlsx`;
    XLSX.writeFile(wb, dosyaAdi);
}

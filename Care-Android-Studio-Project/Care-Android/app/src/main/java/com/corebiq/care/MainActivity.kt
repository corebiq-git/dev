package com.corebiq.care

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.runtime.*
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.auth.FirebaseAuth
import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

private val Navy = Color(0xFF102B46)
private val Blue = Color(0xFF1685C5)
private val Bg = Color(0xFFF3F6FA)
private val Muted = Color(0xFF6F8192)
private val Border = Color(0xFFE6ECF2)
private val Green = Color(0xFF159B75)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        FirebaseSetup.initialize(this)
        setContent { CareTheme { CareRoot() } }
    }
}

@Composable
fun CareTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(primary = Blue, secondary = Navy, background = Bg, surface = Color.White),
        typography = Typography(), content = content
    )
}

data class CareModule(val title: String, val subtitle: String, val icon: ImageVector)
private val careModules = listOf(
    CareModule("Patients", "Patient records and profiles", Icons.Default.PeopleAlt),
    CareModule("Appointments", "Bookings and schedules", Icons.Default.CalendarMonth),
    CareModule("Therapy Plans", "Treatment plans and progress", Icons.Default.FavoriteBorder),
    CareModule("Billing & Payments", "Invoices and collections", Icons.Default.Payments),
    CareModule("Branches", "Clinic locations", Icons.Default.Business),
    CareModule("Staff & Therapists", "Team and permissions", Icons.Default.Badge),
    CareModule("Attendance", "Staff attendance", Icons.Default.HowToReg),
    CareModule("Reports", "Business performance", Icons.Default.Insights),
    CareModule("Documents", "Files and records", Icons.Default.FolderOpen),
    CareModule("Settings", "Application preferences", Icons.Default.Settings)
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CareRoot() {
    var page by remember { mutableStateOf("Dashboard") }
    var signedIn by remember { mutableStateOf(FirebaseAuth.getInstance().currentUser != null) }
    var previewMode by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var drawerOpen by remember { mutableStateOf(false) }
    var branch by remember { mutableStateOf("All branches") }

    if (!signedIn && !previewMode) {
        LoginScreen(
            email = email, onEmail = { email = it }, password = password, onPassword = { password = it },
            error = error, loading = loading,
            onSignIn = {
                loading = true; error = ""
                FirebaseAuth.getInstance().signInWithEmailAndPassword(email.trim(), password)
                    .addOnCompleteListener { task ->
                        loading = false
                        if (task.isSuccessful) signedIn = true else error = task.exception?.localizedMessage ?: "Unable to sign in"
                    }
            }, onPreview = { previewMode = true }
        )
        return
    }

    val drawerState = rememberDrawerState(DrawerValue.Closed)
    LaunchedEffect(drawerOpen) { if (drawerOpen) drawerState.open() else drawerState.close() }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(modifier = Modifier.width(300.dp), drawerContainerColor = Color.White) {
                DrawerHeader()
                Spacer(Modifier.height(12.dp))
                NavigationEntry("Dashboard", Icons.Default.Dashboard, page == "Dashboard") { page = "Dashboard"; drawerOpen = false }
                Text("WORKSPACE", modifier = Modifier.padding(start = 20.dp, top = 20.dp, bottom = 8.dp), color = Muted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
                careModules.forEach { module ->
                    NavigationEntry(module.title, module.icon, page == module.title) { page = module.title; drawerOpen = false }
                }
                Spacer(Modifier.weight(1f))
                HorizontalDivider(color = Border)
                NavigationEntry("Help & support", Icons.Default.HelpOutline, false) { page = "Help & support"; drawerOpen = false }
                NavigationEntry("Sign out", Icons.Default.Logout, false) {
                    if (signedIn) FirebaseAuth.getInstance().signOut()
                    signedIn = false; previewMode = false; drawerOpen = false
                }
                Spacer(Modifier.height(12.dp))
            }
        }
    ) {
        Scaffold(
            containerColor = Bg,
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Text(page, color = Navy, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                            Text("CARE  /  POWERED BY COREBIQ", color = Muted, fontSize = 9.sp, letterSpacing = 1.sp)
                        }
                    },
                    navigationIcon = { IconButton(onClick = { drawerOpen = true }) { Icon(Icons.Default.Menu, "Open navigation", tint = Navy) } },
                    actions = {
                        IconButton(onClick = { page = "Notifications" }) { Icon(Icons.Default.NotificationsNone, "Notifications", tint = Navy) }
                        Box(Modifier.padding(end = 14.dp).size(34.dp).clip(CircleShape).background(Color(0xFFE3F1FA)), contentAlignment = Alignment.Center) {
                            Text(if (signedIn) (FirebaseAuth.getInstance().currentUser?.email?.firstOrNull()?.uppercase() ?: "C") else "C", color = Blue, fontWeight = FontWeight.Bold)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
                )
            }
        ) { padding ->
            Column(Modifier.fillMaxSize().padding(padding)) {
                if (previewMode) {
                    Row(Modifier.fillMaxWidth().background(Color(0xFFFFF5DD)).padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Visibility, null, tint = Color(0xFF9B6A00), modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp)); Text("Preview mode · sample dashboard only", color = Color(0xFF805800), fontSize = 12.sp)
                    }
                }
                if (page == "Dashboard") DashboardScreen(branch, onBranch = { branch = it }, onOpen = { page = it })
                else ModuleScreen(page, previewMode, onBack = { page = "Dashboard" })
            }
        }
    }
}

@Composable
private fun DrawerHeader() {
    Column(Modifier.fillMaxWidth().background(Navy).padding(start = 22.dp, end = 18.dp, top = 28.dp, bottom = 24.dp)) {
        Box(Modifier.size(46.dp).clip(RoundedCornerShape(14.dp)).background(Color.White), contentAlignment = Alignment.Center) {
            Text("C", color = Blue, fontSize = 28.sp, fontWeight = FontWeight.ExtraBold)
        }
        Spacer(Modifier.height(14.dp))
        Text("Care", color = Color.White, fontSize = 25.sp, fontWeight = FontWeight.Bold)
        Text("Powered by COREBIQ", color = Color(0xFFB9DDF2), fontSize = 12.sp)
        Spacer(Modifier.height(14.dp))
        Text("CLINIC MANAGEMENT", color = Color(0xFFB9C9D7), fontSize = 9.sp, letterSpacing = 1.5.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun NavigationEntry(title: String, icon: ImageVector, selected: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 2.dp).clip(RoundedCornerShape(10.dp))
            .background(if (selected) Color(0xFFEAF5FC) else Color.Transparent)
            .clickable(onClick = onClick).padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, null, tint = if (selected) Blue else Muted, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(14.dp))
        Text(title, color = if (selected) Navy else Color(0xFF425466), fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium, fontSize = 14.sp)
        if (selected) { Spacer(Modifier.weight(1f)); Box(Modifier.width(3.dp).height(18.dp).clip(CircleShape).background(Blue)) }
    }
}

@Composable
private fun DashboardScreen(branch: String, onBranch: (String) -> Unit, onOpen: (String) -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val patientCount = remember { readModuleRecords(context, "Patients").size }
    val appointments = remember { readModuleRecords(context, "Appointments") }
    val bills = remember { readModuleRecords(context, "Billing & Payments") }
    val paidTotal = bills.filter { it.optString("Status").equals("paid", true) }
        .sumOf { it.optString("Amount").replace(Regex("[^0-9.]"), "").toDoubleOrNull() ?: 0.0 }
    val pendingCount = bills.count { !it.optString("Status").equals("paid", true) }
    var branchMenu by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 18.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Good day", color = Muted, fontSize = 13.sp)
                Text("Clinic overview", color = Navy, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            }
            Box {
                OutlinedButton(onClick = { branchMenu = true }, shape = RoundedCornerShape(10.dp), contentPadding = PaddingValues(horizontal = 10.dp, vertical = 8.dp)) {
                    Icon(Icons.Default.LocationOn, null, modifier = Modifier.size(15.dp)); Spacer(Modifier.width(4.dp))
                    Text(branch, fontSize = 11.sp, maxLines = 1); Icon(Icons.Default.ExpandMore, null, modifier = Modifier.size(16.dp))
                }
                DropdownMenu(expanded = branchMenu, onDismissRequest = { branchMenu = false }) {
                    listOf("All branches", "Main branch", "Branch 02").forEach { DropdownMenuItem(text = { Text(it) }, onClick = { onBranch(it); branchMenu = false }) }
                }
            }
        }
        Spacer(Modifier.height(18.dp))
        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(Navy).padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("YOUR CLINIC, CONNECTED", color = Color(0xFF9CCBE7), fontSize = 9.sp, letterSpacing = 1.3.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(7.dp)); Text("Care operations\nat a glance", color = Color.White, fontSize = 21.sp, lineHeight = 26.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp)); Text("Manage patients, appointments and your team from one place.", color = Color(0xFFD0DCE6), fontSize = 11.sp, lineHeight = 16.sp)
            }
            Box(Modifier.size(68.dp).clip(RoundedCornerShape(20.dp)).background(Color(0xFF1E4567)), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.MonitorHeart, null, tint = Color(0xFF8DD0F4), modifier = Modifier.size(38.dp))
            }
        }
        Spacer(Modifier.height(22.dp))
        SectionHeading("Today at a glance", "Based on records saved on this device")
        Spacer(Modifier.height(11.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            DashboardMetric("Patients", patientCount.toString(), "Registered", Icons.Default.Groups, Modifier.weight(1f))
            DashboardMetric("Appointments", appointments.size.toString(), "In your schedule", Icons.Default.CalendarToday, Modifier.weight(1f))
        }
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            DashboardMetric("Collections", "${"%.2f".format(paidTotal)}", "Marked paid", Icons.Default.AccountBalanceWallet, Modifier.weight(1f))
            DashboardMetric("Pending", pendingCount.toString(), "Outstanding bills", Icons.Default.PendingActions, Modifier.weight(1f))
        }
        Spacer(Modifier.height(24.dp))
        SectionHeading("Quick actions", "Common tasks")
        Spacer(Modifier.height(11.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
            QuickAction("Add patient", Icons.Default.PersonAdd, Modifier.weight(1f)) { onOpen("Patients") }
            QuickAction("Book visit", Icons.Default.AddCircleOutline, Modifier.weight(1f)) { onOpen("Appointments") }
            QuickAction("Create bill", Icons.Default.ReceiptLong, Modifier.weight(1f)) { onOpen("Billing & Payments") }
        }
        Spacer(Modifier.height(24.dp))
        SectionHeading("Workspace", "Open a module")
        Spacer(Modifier.height(11.dp))
        careModules.chunked(2).forEach { pair ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                pair.forEach { module -> ModuleCard(module, Modifier.weight(1f)) { onOpen(module.title) } }
                if (pair.size == 1) Spacer(Modifier.weight(1f))
            }
            Spacer(Modifier.height(10.dp))
        }
        Spacer(Modifier.height(14.dp))
        SectionHeading("Schedule", "Today's appointments")
        Spacer(Modifier.height(10.dp))
        Card(shape = RoundedCornerShape(15.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                if (appointments.isEmpty()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.EventAvailable, null, tint = Blue)
                        Spacer(Modifier.width(10.dp)); Text("No appointments yet", color = Navy, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    }
                    Spacer(Modifier.height(5.dp)); Text("Add appointments to build your clinic schedule.", color = Muted, fontSize = 12.sp, lineHeight = 17.sp)
                } else {
                    appointments.take(4).forEachIndexed { index, appointment ->
                        if (index > 0) HorizontalDivider(Modifier.padding(vertical = 7.dp), color = Border)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.EventAvailable, null, tint = Blue, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(10.dp)); Column(Modifier.weight(1f)) {
                                Text(appointment.optString("Patient", "Patient"), color = Navy, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                Text(listOf(appointment.optString("Date & time"), appointment.optString("Therapist"), appointment.optString("Status")).filter { it.isNotBlank() }.joinToString(" · ").ifBlank { "Appointment" }, color = Muted, fontSize = 11.sp)
                            }
                        }
                    }
                }
                TextButton(onClick = { onOpen("Appointments") }, contentPadding = PaddingValues(0.dp)) { Text("Open appointments", fontSize = 12.sp) }
            }
        }
        Spacer(Modifier.height(24.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
            Text("CARE  ·  POWERED BY COREBIQ", color = Muted, fontSize = 9.sp, letterSpacing = 1.1.sp)
        }
        Spacer(Modifier.height(20.dp))
    }
}

@Composable
private fun SectionHeading(title: String, subtitle: String) {
    Column {
        Text(title, color = Navy, fontSize = 17.sp, fontWeight = FontWeight.Bold)
        Text(subtitle, color = Muted, fontSize = 11.sp)
    }
}

@Composable
private fun DashboardMetric(title: String, value: String, caption: String, icon: ImageVector, modifier: Modifier) {
    Card(modifier, shape = RoundedCornerShape(15.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Column(Modifier.fillMaxWidth().padding(13.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(30.dp).clip(RoundedCornerShape(9.dp)).background(Color(0xFFEAF5FC)), contentAlignment = Alignment.Center) {
                    Icon(icon, null, tint = Blue, modifier = Modifier.size(17.dp))
                }
                Spacer(Modifier.width(7.dp)); Text(title, color = Muted, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Spacer(Modifier.height(12.dp)); Text(value, color = Navy, fontSize = 25.sp, fontWeight = FontWeight.Bold)
            Text(caption, color = Muted, fontSize = 10.sp)
        }
    }
}

@Composable
private fun QuickAction(title: String, icon: ImageVector, modifier: Modifier, onClick: () -> Unit) {
    Column(modifier.clip(RoundedCornerShape(13.dp)).background(Color.White).clickable(onClick = onClick).padding(vertical = 13.dp, horizontal = 5.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(icon, null, tint = Blue, modifier = Modifier.size(23.dp)); Spacer(Modifier.height(7.dp))
        Text(title, color = Navy, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
    }
}

@Composable
private fun ModuleCard(module: CareModule, modifier: Modifier, onClick: () -> Unit) {
    Card(modifier.clickable(onClick = onClick), shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Row(Modifier.fillMaxWidth().padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(38.dp).clip(RoundedCornerShape(11.dp)).background(Color(0xFFEAF5FC)), contentAlignment = Alignment.Center) {
                Icon(module.icon, null, tint = Blue, modifier = Modifier.size(21.dp))
            }
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(module.title, color = Navy, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(module.subtitle, color = Muted, fontSize = 9.sp, maxLines = 2, lineHeight = 12.sp)
            }
            Icon(Icons.Default.ChevronRight, null, tint = Muted, modifier = Modifier.size(17.dp))
        }
    }
}

@Composable
private data class ModuleField(val label: String, val hint: String = "")
private data class ModuleConfig(val fields: List<ModuleField>, val description: String)
private val moduleConfigs = mapOf(
    "Patients" to ModuleConfig(listOf(ModuleField("Patient name", "Full name"), ModuleField("Phone", "Contact number"), ModuleField("Email", "Email address"), ModuleField("Condition", "Reason for care")), "Patient directory and contact details"),
    "Appointments" to ModuleConfig(listOf(ModuleField("Patient", "Patient name"), ModuleField("Therapist", "Assigned therapist"), ModuleField("Date & time", "e.g. 24 Nov, 10:30 AM"), ModuleField("Status", "Booked, arrived, completed or cancelled")), "Bookings, visit status and care team"),
    "Therapy Plans" to ModuleConfig(listOf(ModuleField("Patient", "Patient name"), ModuleField("Plan", "Treatment plan"), ModuleField("Start date", "Date"), ModuleField("Progress", "e.g. 3 of 8 sessions")), "Treatment plans and progress"),
    "Billing & Payments" to ModuleConfig(listOf(ModuleField("Patient", "Patient name"), ModuleField("Description", "Service or invoice"), ModuleField("Amount", "Amount"), ModuleField("Status", "Due, paid or overdue")), "Invoices, payments and collections"),
    "Branches" to ModuleConfig(listOf(ModuleField("Branch name", "Location name"), ModuleField("Address", "Street and city"), ModuleField("Phone", "Contact number"), ModuleField("Manager", "Branch manager")), "Clinic locations and contact details"),
    "Staff & Therapists" to ModuleConfig(listOf(ModuleField("Name", "Full name"), ModuleField("Role", "Therapist, receptionist, admin…"), ModuleField("Phone", "Contact number"), ModuleField("Email", "Work email")), "Team directory and roles"),
    "Attendance" to ModuleConfig(listOf(ModuleField("Staff member", "Name"), ModuleField("Date", "Attendance date"), ModuleField("Check-in", "Time"), ModuleField("Note", "Optional note")), "Daily staff attendance records"),
    "Reports" to ModuleConfig(listOf(ModuleField("Report name", "e.g. Monthly collections"), ModuleField("Period", "Date range"), ModuleField("Metric", "Key figure"), ModuleField("Notes", "Summary")), "Track key clinic performance figures"),
    "Documents" to ModuleConfig(listOf(ModuleField("Document name", "Name"), ModuleField("Category", "Type"), ModuleField("Related to", "Patient, staff or clinic"), ModuleField("Notes", "File reference or notes")), "Document register and file references"),
    "Settings" to ModuleConfig(listOf(ModuleField("Setting", "Preference name"), ModuleField("Value", "Preference value"), ModuleField("Description", "Details")), "Clinic preferences and configuration"),
    "Notifications" to ModuleConfig(listOf(ModuleField("Title", "Notification"), ModuleField("Details", "More information"), ModuleField("Date", "When"), ModuleField("Status", "Unread or read")), "Clinic alerts and reminders"),
    "Help & support" to ModuleConfig(listOf(ModuleField("Topic", "How can we help?"), ModuleField("Details", "Describe the issue"), ModuleField("Contact", "Email or phone")), "Support requests and useful information")
)

private fun readModuleRecords(context: Context, module: String): MutableList<JSONObject> {
    val json = context.getSharedPreferences("care_records", Context.MODE_PRIVATE).getString(module, "[]") ?: "[]"
    return try { val array = JSONArray(json); MutableList(array.length()) { array.getJSONObject(it) } } catch (_: Exception) { mutableListOf() }
}

private fun saveModuleRecords(context: Context, module: String, records: List<JSONObject>) {
    val array = JSONArray(); records.forEach { array.put(it) }
    context.getSharedPreferences("care_records", Context.MODE_PRIVATE).edit().putString(module, array.toString()).apply()
}

@Composable
private fun ModuleScreen(title: String, previewMode: Boolean, onBack: () -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val config = moduleConfigs[title] ?: ModuleConfig(listOf(ModuleField("Title"), ModuleField("Details")), "Workspace")
    var records by remember(title) { mutableStateOf(readModuleRecords(context, title)) }
    var search by remember(title) { mutableStateOf("") }
    var showEditor by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<JSONObject?>(null) }
    var formError by remember { mutableStateOf("") }
    var values by remember { mutableStateOf(config.fields.associate { it.label to "" }) }
    val filtered = records.filter { record -> config.fields.any { record.optString(it.label).contains(search, true) } }
    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back", tint = Navy) }
            Column(Modifier.weight(1f)) { Text(title, color = Navy, fontSize = 21.sp, fontWeight = FontWeight.Bold); Text(config.description, color = Muted, fontSize = 11.sp) }
            FilledTonalIconButton(onClick = { editing = null; values = config.fields.associate { it.label to "" }; formError = ""; showEditor = true }) { Icon(Icons.Default.Add, "Add record") }
        }
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(value = search, onValueChange = { search = it }, modifier = Modifier.fillMaxWidth(), singleLine = true, shape = RoundedCornerShape(12.dp), placeholder = { Text("Search ${title.lowercase()}…") }, leadingIcon = { Icon(Icons.Default.Search, null) }, trailingIcon = { if (search.isNotEmpty()) IconButton(onClick = { search = "" }) { Icon(Icons.Default.Close, "Clear") } })
        Spacer(Modifier.height(10.dp))
        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Color(0xFFEAF5FC)).padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Storage, null, tint = Blue, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(9.dp))
            Text("${records.size} ${if (records.size == 1) "record" else "records"} · Stored on this device${if (previewMode) " · Preview" else ""}", color = Navy, fontSize = 12.sp)
        }
        Spacer(Modifier.height(10.dp))
        if (filtered.isEmpty()) {
            Column(Modifier.fillMaxWidth().weight(1f), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                Icon(if (search.isEmpty()) Icons.Default.Inbox else Icons.Default.SearchOff, null, tint = Color(0xFF9BAAB7), modifier = Modifier.size(42.dp))
                Spacer(Modifier.height(10.dp)); Text(if (search.isEmpty()) "No ${title.lowercase()} yet" else "No matching records", color = Navy, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                Text(if (search.isEmpty()) "Add a record to get started." else "Try a different search.", color = Muted, fontSize = 12.sp)
                if (search.isEmpty()) { Spacer(Modifier.height(12.dp)); Button(onClick = { editing = null; values = config.fields.associate { it.label to "" }; showEditor = true }) { Icon(Icons.Default.Add, null); Spacer(Modifier.width(6.dp)); Text("Add ${title.removeSuffix("s")}") } }
            }
        } else {
            LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(9.dp), contentPadding = PaddingValues(bottom = 16.dp)) {
                items(filtered.size) { index ->
                    val record = filtered[index]
                    Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                        Row(Modifier.fillMaxWidth().clickable { editing = record; values = config.fields.associate { it.label to record.optString(it.label) }; showEditor = true }.padding(start = 14.dp, top = 12.dp, bottom = 12.dp, end = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(38.dp).clip(RoundedCornerShape(11.dp)).background(Color(0xFFEAF5FC)), contentAlignment = Alignment.Center) { Icon(careModules.find { it.title == title }?.icon ?: Icons.Default.Description, null, tint = Blue, modifier = Modifier.size(20.dp)) }
                            Spacer(Modifier.width(11.dp)); Column(Modifier.weight(1f)) {
                                Text(record.optString(config.fields.first().label, "Untitled"), color = Navy, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                val details = config.fields.drop(1).mapNotNull { f -> record.optString(f.label).takeIf { it.isNotBlank() }?.let { "${f.label}: $it" } }.take(2).joinToString("  ·  ")
                                Text(details.ifBlank { "Tap to view or edit" }, color = Muted, fontSize = 11.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            }
                            IconButton(onClick = { val updated = records.toMutableList(); updated.remove(record); records = updated; saveModuleRecords(context, title, updated) }) { Icon(Icons.Default.DeleteOutline, "Delete record", tint = Muted) }
                        }
                    }
                }
            }
        }
    }
    if (showEditor) {
        AlertDialog(onDismissRequest = { showEditor = false }, title = { Text(if (editing == null) "Add ${title.removeSuffix("s")}" else "Edit record") },
            text = { Column(Modifier.heightIn(max = 420.dp).verticalScroll(rememberScrollState())) {
                config.fields.forEach { field -> OutlinedTextField(value = values[field.label].orEmpty(), onValueChange = { values = values + (field.label to it); formError = "" }, label = { Text(field.label) }, placeholder = { if (field.hint.isNotBlank()) Text(field.hint) }, modifier = Modifier.fillMaxWidth().padding(bottom = 7.dp), singleLine = true, shape = RoundedCornerShape(10.dp)) }
                if (formError.isNotBlank()) Text(formError, color = Color(0xFFB3261E), fontSize = 12.sp)
            } },
            confirmButton = { TextButton(onClick = {
                if (values[config.fields.first().label].isNullOrBlank()) { formError = "${config.fields.first().label} is required" }
                else { val record = JSONObject(); values.forEach { (key, value) -> record.put(key, value.trim()) }; val updated = records.toMutableList(); if (editing == null) updated.add(0, record) else { val index = updated.indexOf(editing); if (index >= 0) updated[index] = record }; records = updated; saveModuleRecords(context, title, updated); showEditor = false }
            }) { Text("Save") } }, dismissButton = { TextButton(onClick = { showEditor = false }) { Text("Cancel") } })
    }
}

@Composable
private fun LoginScreen(
    email: String, onEmail: (String) -> Unit, password: String, onPassword: (String) -> Unit,
    error: String, loading: Boolean, onSignIn: () -> Unit, onPreview: () -> Unit
) {
    Column(Modifier.fillMaxSize().background(Bg).verticalScroll(rememberScrollState()).padding(26.dp), verticalArrangement = Arrangement.Center) {
        Box(Modifier.size(58.dp).clip(RoundedCornerShape(17.dp)).background(Navy), contentAlignment = Alignment.Center) {
            Text("C", color = Color.White, fontSize = 34.sp, fontWeight = FontWeight.ExtraBold)
        }
        Spacer(Modifier.height(18.dp)); Text("Care", color = Navy, fontSize = 34.sp, fontWeight = FontWeight.Bold)
        Text("Powered by COREBIQ", color = Blue, fontSize = 14.sp)
        Spacer(Modifier.height(8.dp)); Text("Clinic management, connected.", color = Muted, fontSize = 13.sp)
        Spacer(Modifier.height(30.dp))
        OutlinedTextField(value = email, onValueChange = onEmail, label = { Text("Email address") }, singleLine = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(value = password, onValueChange = onPassword, label = { Text("Password") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
        if (error.isNotBlank()) { Spacer(Modifier.height(8.dp)); Text(error, color = Color(0xFFB3261E), fontSize = 12.sp) }
        Spacer(Modifier.height(18.dp))
        Button(onClick = onSignIn, enabled = !loading && email.isNotBlank() && password.isNotBlank(), modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(12.dp)) {
            Text(if (loading) "Signing in…" else "Sign in")
        }
        Spacer(Modifier.height(10.dp))
        OutlinedButton(onClick = onPreview, modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(12.dp)) {
            Icon(Icons.Default.Visibility, null, modifier = Modifier.size(17.dp)); Spacer(Modifier.width(8.dp)); Text("Preview dashboard")
        }
        Spacer(Modifier.height(12.dp)); Text("Preview uses sample placeholders only. Sign in to access authenticated data when backend access is configured.", color = Muted, fontSize = 11.sp, lineHeight = 16.sp)
    }
}

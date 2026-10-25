package ci.zupa.app;

import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.Window;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;

/**
 * ZUPA — barres système « bord à bord » sur toutes les versions d'Android.
 * La page s'affiche sous la barre d'état (le ciel de l'onglet Go, la couleur de chaque onglet s'y voient)
 * et reçoit les hauteurs des barres en variables CSS : --sat (haut), --sab (bas), --sal, --sar.
 * setStyle({ statusLight, navLight }) : icônes claires (sur fond foncé) ou foncées.
 */
@CapacitorPlugin(name = "ZupaBars")
public class ZupaBarsPlugin extends Plugin {

    private int top = 0, bottom = 0, left = 0, right = 0;

    @Override
    public void load() {
        getActivity().runOnUiThread(() -> {
            Window w = getActivity().getWindow();
            WindowCompat.setDecorFitsSystemWindows(w, false);
            if (Build.VERSION.SDK_INT < 35) {
                w.setStatusBarColor(Color.TRANSPARENT);
                w.setNavigationBarColor(Color.TRANSPARENT);
            }
            if (Build.VERSION.SDK_INT >= 29) {
                w.setStatusBarContrastEnforced(false);
                w.setNavigationBarContrastEnforced(false);
            }
            View root = w.getDecorView();
            ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
                Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
                Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
                boolean kb = insets.isVisible(WindowInsetsCompat.Type.ime());
                // clavier ouvert : la page rétrécit au-dessus du clavier
                v.setPadding(0, 0, 0, kb ? ime.bottom : 0);
                float d = getActivity().getResources().getDisplayMetrics().density;
                top = Math.round(bars.top / d);
                bottom = kb ? 0 : Math.round(bars.bottom / d);
                left = Math.round(bars.left / d);
                right = Math.round(bars.right / d);
                inject();
                // insets remis à zéro (et non « consommés ») pour que la WebView n'ajoute pas ses propres marges
                return new WindowInsetsCompat.Builder(insets)
                    .setInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout(), Insets.of(0, 0, 0, 0))
                    .build();
            });
            root.requestApplyInsets();
        });
    }

    private void inject() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        String js = String.format(Locale.US,
            "try{var s=document.documentElement.style;s.setProperty('--sat','%dpx');s.setProperty('--sab','%dpx');s.setProperty('--sal','%dpx');s.setProperty('--sar','%dpx');window.dispatchEvent(new Event('zupabars'));}catch(e){}",
            top, bottom, left, right);
        getBridge().executeOnMainThread(() -> getBridge().getWebView().evaluateJavascript(js, null));
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        inject();
    }

    @PluginMethod
    public void insets(PluginCall call) {
        inject();
        JSObject r = new JSObject();
        r.put("top", top); r.put("bottom", bottom); r.put("left", left); r.put("right", right);
        call.resolve(r);
    }

    @PluginMethod
    public void setStyle(PluginCall call) {
        boolean statusLight = Boolean.TRUE.equals(call.getBoolean("statusLight", true));
        boolean navLight = Boolean.TRUE.equals(call.getBoolean("navLight", false));
        getActivity().runOnUiThread(() -> {
            Window w = getActivity().getWindow();
            WindowInsetsControllerCompat c = WindowCompat.getInsetsController(w, w.getDecorView());
            // « appearanceLight » = icônes foncées pour un fond clair
            c.setAppearanceLightStatusBars(!statusLight);
            c.setAppearanceLightNavigationBars(!navLight);
            call.resolve();
        });
    }
}

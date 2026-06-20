import SwiftUI

struct ContentView: View {
    private let productionURL = URL(string: "https://markdown-memory.vercel.app")!

    @State private var isShowingWebApp = false

    var body: some View {
        VStack(spacing: 24) {
            Spacer(minLength: 48)

            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 52, weight: .semibold))
                .foregroundStyle(.tint)
                .accessibilityHidden(true)

            VStack(spacing: 8) {
                Text("Markdown Memory")
                    .font(.title.bold())

                Text("Production Web/PWAをTestFlight検証用に開きます。")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }

            Button {
                isShowingWebApp = true
            } label: {
                Label("Webアプリを開く", systemImage: "safari")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding(.horizontal, 32)

            Text("Googleログイン互換性を優先するため、認証はSafariの安全なブラウザコンテキストで行います。")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Spacer(minLength: 48)
        }
        .background(Color(.systemGroupedBackground))
        .fullScreenCover(isPresented: $isShowingWebApp) {
            SafariWebView(url: productionURL)
                .ignoresSafeArea()
        }
        .task {
            isShowingWebApp = true
        }
    }
}

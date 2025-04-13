<script lang="ts">
let { enabled = $bindable(false) } = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class={["checkbox-container", enabled ? "is-enabled" : ""]}
  onclick={() => {
    enabled = !enabled;
  }}
>
  <input type="checkbox" tabindex="0" />
</div>
